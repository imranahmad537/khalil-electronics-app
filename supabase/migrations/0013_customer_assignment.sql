-- Customer ↔ AVO assignment: each customer has exactly one officer
-- (customers.avo_id). Assigning to another officer is a TRANSFER — it now
-- needs explicit confirmation, is recorded in a history, and leaves the old
-- officer a short grace period to sync cash collected offline before the move.

create table if not exists customer_assignments (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references customers on delete cascade,
  avo_id        uuid not null references profiles on delete cascade,
  assigned_at   timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by   uuid references profiles on delete set null,
  reason        text
);
create index if not exists customer_assignments_customer_idx on customer_assignments (customer_id, unassigned_at);
create unique index if not exists customer_assignments_one_open on customer_assignments (customer_id) where unassigned_at is null;

alter table customer_assignments enable row level security;
create policy office_read on customer_assignments for select using (is_office());

-- current assignments become the first history rows
insert into customer_assignments (customer_id, avo_id, assigned_at)
select c.id, c.avo_id, c.created_at from customers c
 where c.avo_id is not null
   and not exists (select 1 from customer_assignments a where a.customer_id = c.id and a.unassigned_at is null);

-- keep the history in step with customers.avo_id, however it changes
-- (new sale, transfer, reassignment)
create or replace function track_customer_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.avo_id is not distinct from old.avo_id then return new; end if;
  update customer_assignments set unassigned_at = now()
   where customer_id = new.id and unassigned_at is null;
  if new.avo_id is not null then
    insert into customer_assignments (customer_id, avo_id, assigned_by, reason)
    values (new.id, new.avo_id, auth.uid(), nullif(current_setting('ke.assign_reason', true), ''));
  end if;
  return new;
end $$;
drop trigger if exists trg_track_assignment on customers;
create trigger trg_track_assignment after insert or update of avo_id on customers
  for each row execute function track_customer_assignment();

-- Assign / transfer. Customers already with this officer are left alone.
-- Taking customers from another ACTIVE officer requires p_transfer = true
-- (the screen asks first); unassigned customers and those of inactive
-- officers can be assigned freely. Pending house visits move with them.
drop function if exists assign_customers(uuid[], uuid);
create or replace function assign_customers(p_customers uuid[], p_avo uuid, p_transfer boolean default false, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_new int; v_moved int; v_same int; v_blocked int; v_from text;
begin
  if not is_office() then raise exception 'Your role can''t reassign customers.' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = p_avo and role = 'avo' and active) then
    raise exception 'Choose an active field officer.';
  end if;

  select count(*) filter (where c.avo_id = p_avo),
         count(*) filter (where c.avo_id is not null and c.avo_id <> p_avo and p.active),
         string_agg(distinct p.full_name, ', ') filter (where c.avo_id is not null and c.avo_id <> p_avo and p.active)
    into v_same, v_blocked, v_from
    from customers c left join profiles p on p.id = c.avo_id
   where c.id = any(p_customers);

  if v_blocked > 0 and not p_transfer then
    raise exception '% of these customers already belong to % — confirm the transfer to move them.', v_blocked, v_from;
  end if;

  perform set_config('ke.assign_reason', coalesce(trim(p_reason), ''), true);

  -- unassigned, or with an inactive officer
  with upd as (
    update customers c set avo_id = p_avo
     where c.id = any(p_customers)
       and (c.avo_id is null or not exists (select 1 from profiles p where p.id = c.avo_id and p.active))
    returning 1
  ) select count(*) into v_new from upd;

  -- transfers from another active officer
  with upd as (
    update customers c set avo_id = p_avo
     where c.id = any(p_customers) and c.avo_id is not null and c.avo_id <> p_avo
       and exists (select 1 from profiles p where p.id = c.avo_id and p.active)
    returning 1
  ) select count(*) into v_moved from upd;

  update verifications set avo_id = p_avo where customer_id = any(p_customers) and status = 'pending';

  return jsonb_build_object('assigned', v_new, 'transferred', v_moved, 'unchanged', v_same);
end $$;

revoke execute on function assign_customers(uuid[], uuid, boolean, text) from public, anon;
grant execute on function assign_customers(uuid[], uuid, boolean, text) to authenticated, service_role;

-- post_receipt: allow the previous AVO's offline collections for 3 days after a transfer
create or replace function post_receipt(
  p_agreement uuid, p_amount numeric, p_mode pay_mode, p_account money_account,
  p_lat double precision default null, p_lng double precision default null,
  p_client_ref uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role user_role := my_role();
  v_agr agreements; v_inst installments; v_next installments;
  v_owed numeric; v_outstanding numeric; v_credit numeric; v_receipt uuid; v_seq int;
begin
  if p_client_ref is not null then
    perform pg_advisory_xact_lock(hashtext('receipt:' || p_client_ref::text));
    select id into v_receipt from receipts where client_ref = p_client_ref;
    if found then return v_receipt; end if;
  end if;

  if v_role is null and not is_system() then
    raise exception 'Your login is not active.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Enter an amount greater than zero.'; end if;

  select * into v_agr from agreements where id = p_agreement for update;
  if not found then raise exception 'Agreement not found.'; end if;

  -- the assigned AVO, or the previous AVO for 3 days after a transfer (cash
  -- collected offline before the move still syncs; client_ref stops doubles)
  if v_role = 'avo' and not exists (
    select 1 from customers where id = v_agr.customer_id and avo_id = auth.uid()
  ) and not exists (
    select 1 from customer_assignments
     where customer_id = v_agr.customer_id and avo_id = auth.uid()
       and unassigned_at > now() - interval '3 days'
  ) then
    raise exception 'This customer isn''t assigned to you.' using errcode = '42501';
  end if;

  if v_agr.status <> 'open' then
    raise exception 'Agreement #% is %, not open for collection.',
      v_agr.agreement_no, replace(v_agr.status::text, '_', ' ');
  end if;

  select coalesce(sum(due_amount + carry_in - paid), 0) into v_outstanding
    from installments where agreement_id = p_agreement;
  if p_amount > v_outstanding then
    raise exception 'Rs % is more than the Rs % still owed on agreement #%.',
      p_amount, v_outstanding, v_agr.agreement_no;
  end if;

  select * into v_inst from installments
   where agreement_id = p_agreement and status <> 'paid'
   order by seq limit 1 for update;
  if not found then raise exception 'Agreement has no open installments.'; end if;

  v_owed := v_inst.due_amount + v_inst.carry_in - v_inst.paid;

  if p_amount < v_owed then
    select * into v_next from installments
     where agreement_id = p_agreement and seq = v_inst.seq + 1 for update;
    if found then
      -- short: settle this month at exactly its owed amount, move the gap forward
      update installments set paid = due_amount + carry_in, status = 'paid' where id = v_inst.id;
      update installments set carry_in = carry_in + (v_owed - p_amount) where id = v_next.id;
    else
      -- last installment: nothing to carry into — it stays short
      update installments set paid = paid + p_amount, status = 'short' where id = v_inst.id;
    end if;
  else
    -- exact or extra: this month is settled; extra becomes a credit (negative
    -- carry) on the following month(s). A credit bigger than a whole month
    -- settles that month too and keeps flowing forward.
    update installments set paid = due_amount + carry_in, status = 'paid' where id = v_inst.id;
    v_credit := p_amount - v_owed;
    v_seq := v_inst.seq;
    while v_credit > 0 loop
      v_seq := v_seq + 1;
      select * into v_next from installments
       where agreement_id = p_agreement and seq = v_seq for update;
      exit when not found;  -- unreachable: p_amount <= outstanding
      v_owed := v_next.due_amount + v_next.carry_in - v_next.paid;
      if v_credit >= v_owed then
        update installments set carry_in = carry_in - v_owed, status = 'paid' where id = v_next.id;
        v_credit := v_credit - v_owed;
      else
        update installments set carry_in = carry_in - v_credit where id = v_next.id;
        v_credit := 0;
      end if;
    end loop;
  end if;

  insert into receipts (agreement_id, installment_id, customer_id, amount, mode, account,
                        collected_by, lat, lng, client_ref)
  values (p_agreement, v_inst.id, v_agr.customer_id, p_amount, p_mode, p_account,
          auth.uid(), p_lat, p_lng, p_client_ref)
  returning id into v_receipt;

  if not exists (select 1 from installments where agreement_id = p_agreement and status <> 'paid') then
    update agreements set status = 'closed', closed_on = shop_today() where id = p_agreement;
  end if;

  return v_receipt;
end $$;
