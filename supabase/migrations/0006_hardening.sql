-- Production hardening — fixes from "Installment System — Production Readiness Review".
-- Section numbers (2a, 1d, …) refer to that review. Earlier migrations are left
-- untouched; everything here replaces/extends them.

-- =====================================================================
-- 4b. Shop clock. The shop runs on Asia/Karachi (UTC+5); a default Supabase
-- database runs on UTC, so for 5 hours every night current_date is still
-- "yesterday". Every date boundary below goes through shop_today().
-- =====================================================================

create or replace function shop_today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Karachi')::date
$$;

-- Belt and braces for anything still using current_date / now()::date
-- (column defaults, ad-hoc SQL). Applies to new connections.
do $$ begin
  execute format('alter database %I set timezone to %L', current_database(), 'Asia/Karachi');
end $$;

alter table agreements      alter column opened_on set default shop_today();
alter table purchases       alter column bill_date set default shop_today();
alter table vendor_payments alter column paid_on   set default shop_today();
alter table expenses        alter column spent_on  set default shop_today();

-- =====================================================================
-- 2d. Identity: an inactive profile has no role, so every RLS policy and RPC
-- check below denies it. security definer so policies on profiles itself can
-- call it without recursing into profiles' own RLS.
-- =====================================================================

create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function is_office() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(my_role() in ('owner','manager','accountant','sales'), false)
$$;

-- Trusted server-side callers (service-role key in scripts/seed-demo.mjs, the
-- SQL editor, pg_cron). session_user is not changed by security definer.
create or replace function is_system() returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin')
$$;

-- =====================================================================
-- 2a. RLS on the four tables 0003 missed.
-- =====================================================================

alter table profiles          enable row level security;
alter table products          enable row level security;
alter table categories        enable row level security;
alter table message_templates enable row level security;

-- profiles: every active staff member can see the staff list (names on
-- receipts, officer pickers); you can edit your own name/cell; only
-- owner/manager create or remove profiles.
create policy staff_read  on profiles for select using (id = auth.uid() or my_role() is not null);
create policy self_update on profiles for update using (id = auth.uid() and my_role() is not null) with check (id = auth.uid());
create policy admin_write on profiles for all
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

-- Column-level guard: RLS can't restrict *which columns* change, so a trigger
-- does. Nobody changes their own role/active flag; only the owner assigns
-- roles; owner/manager toggle active.
create or replace function guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_me user_role := my_role();
begin
  if is_system() then return new; end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' and v_me is distinct from 'owner' then
      raise exception 'Only the owner can create another owner.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    if v_me is distinct from 'owner' or new.id = auth.uid() then
      raise exception 'Only the owner can change roles, and not their own.' using errcode = '42501';
    end if;
  end if;
  if new.active is distinct from old.active then
    if coalesce(v_me in ('owner','manager'), false) = false or new.id = auth.uid() then
      raise exception 'Only an owner or manager can activate/deactivate logins, and not their own.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile on profiles;
create trigger trg_guard_profile before insert or update on profiles
  for each row execute function guard_profile_privileges();

-- products / categories: everyone on staff reads; stock & prices are written
-- by owner/manager/accountant (purchasing). Sales goes through create_sale.
create policy staff_read  on products for select using (my_role() is not null);
create policy stock_write on products for all
  using (my_role() in ('owner','manager','accountant')) with check (my_role() in ('owner','manager','accountant'));
create policy staff_read  on categories for select using (my_role() is not null);
create policy stock_write on categories for all
  using (my_role() in ('owner','manager','accountant')) with check (my_role() in ('owner','manager','accountant'));

create policy office_read on message_templates for select using (is_office());
create policy admin_write on message_templates for all
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

-- =====================================================================
-- 2b / 2c. The ledger is read-only through the REST API. Agreements,
-- installments, receipts and verifications change only through the security
-- definer RPCs below, which carry the business rules and role checks.
-- =====================================================================

drop policy if exists office_all on agreements;
drop policy if exists office_all on agreement_items;
drop policy if exists office_all on installments;
drop policy if exists office_all on receipts;
drop policy if exists avo_insert on receipts;
drop policy if exists office_all on verifications;
drop policy if exists avo_own    on verifications;

create policy office_read on agreements      for select using (is_office());
create policy office_read on agreement_items for select using (is_office());
create policy avo_read    on agreement_items for select
  using (exists (select 1 from agreements a join customers c on c.id = a.customer_id
                 where a.id = agreement_id and c.avo_id = auth.uid()));
create policy office_read on installments    for select using (is_office());
create policy office_read on receipts        for select using (is_office());
create policy office_read on verifications   for select using (is_office());
create policy avo_read    on verifications   for select using (avo_id = auth.uid());

-- =====================================================================
-- 2d. Deactivating an employee also disables their login.
-- Returns the profile id so the server action can also ban the auth user.
-- =====================================================================

create or replace function set_employee_active(p_employee uuid, p_active boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_profile uuid;
begin
  if not is_system() and coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only an owner or manager can change employee status.' using errcode = '42501';
  end if;

  select profile_id into v_profile from employees where id = p_employee for update;
  if not found then raise exception 'Employee not found.'; end if;
  if v_profile is not null and v_profile = auth.uid() then
    raise exception 'You can''t deactivate your own login.';
  end if;

  update employees set active = p_active where id = p_employee;
  if v_profile is not null then
    update profiles set active = p_active where id = v_profile;
  end if;
  return v_profile;
end $$;

-- =====================================================================
-- 5. Data integrity: no negative stock, no IMEI sold twice.
-- NOT VALID: enforced for every new write without failing on any bad
-- historical row (run `alter table products validate constraint …` once
-- existing stock has been corrected).
-- =====================================================================

alter table products add constraint products_stock_nonnegative check (stock >= 0) not valid;

create or replace function guard_unique_serial() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_serial text := nullif(upper(trim(new.serial_no)), ''); v_no int;
begin
  new.serial_no := v_serial;
  if v_serial is null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('serial:' || v_serial));
  select a.agreement_no into v_no
    from agreement_items ai join agreements a on a.id = ai.agreement_id
   where upper(ai.serial_no) = v_serial and a.status <> 'cancelled' and ai.id <> new.id
   limit 1;
  if found then
    raise exception 'Serial/IMEI % is already sold on agreement #%.', v_serial, v_no using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists trg_unique_serial on agreement_items;
create trigger trg_unique_serial before insert or update of serial_no on agreement_items
  for each row execute function guard_unique_serial();

-- =====================================================================
-- 3a / 3b. Idempotency keys. The client generates a UUID per attempt and
-- reuses it on retry; a second call with the same key returns the first
-- result instead of creating a second sale / second receipt.
-- =====================================================================

alter table agreements add column if not exists client_ref uuid unique;
alter table receipts   add column if not exists client_ref uuid unique;

-- 4a. A verification belongs to one agreement (a repeat customer can have
-- an open agreement and a new pending one — reject must not touch the old one).
alter table verifications add column if not exists agreement_id uuid references agreements on delete cascade;
update verifications v
   set agreement_id = (select a.id from agreements a
                        where a.customer_id = v.customer_id and a.status = 'pending_verification'
                        order by a.created_at desc limit 1)
 where v.agreement_id is null and v.status = 'pending';
create index if not exists verifications_agreement_idx on verifications (agreement_id);

-- Load-balance fallback for AVO assignment (replaces fetching every
-- customers.avo_id row into the app server).
create or replace function least_loaded_avo() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id
    from profiles p left join customers c on c.avo_id = p.id
   where p.role = 'avo' and p.active
   group by p.id
   order by count(c.id), p.id
   limit 1
$$;

-- =====================================================================
-- 1a / 1b / 1c / 2d / 3a. One atomic sale: customer + guarantors + agreement
-- + stock + schedule + signing-day receipt + verification, in one transaction.
--
-- 1a: the advance reduces the financed amount. Installments are scheduled
--     against (total − advance), so  advance + Σ installments = total.
-- 1b: the money taken at the counter is a real receipt (direct sale: the
--     full total; installment: advance + installment 1).
-- 1c: that receipt carries the actual pay mode and money account.
-- =====================================================================

drop function if exists create_agreement(uuid, sale_type, smallint, jsonb, numeric, uuid);

create or replace function create_sale(
  p_client_ref   uuid,
  p_customer_id  uuid,          -- existing customer, or null to create p_new_customer
  p_new_customer jsonb,         -- {full_name, father_name, cnic, cell, cell2, address, area, occupation, avo_id}
  p_guarantors   jsonb,         -- null keeps the customer's existing guarantors; else [{slot, full_name, cnic, cell, relation, address}]
  p_items        jsonb,         -- [{product_id, qty, unit_price, serial_no}]
  p_plan         smallint,      -- 10 | 12 for an installment sale, null for a direct sale
  p_advance      numeric,
  p_mode         pay_mode,
  p_account      money_account
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_existing agreements;
  v_sale sale_type := case when p_plan is null then 'direct'::sale_type else 'installment'::sale_type end;
  v_today date := shop_today();
  v_first date := (date_trunc('month', shop_today()) + interval '1 month')::date;
  v_advance numeric := coalesce(p_advance, 0);
  v_cust uuid; v_blacklisted boolean; v_avo uuid; v_avo_name text;
  v_total numeric; v_financed numeric; v_monthly numeric := 0; v_collect numeric;
  v_id uuid; v_no int; v_inst1 uuid; v_receipt uuid;
  v_item jsonb; v_g jsonb; v_qty int; v_price numeric; v_stock int; v_pname text; i int;
begin
  if not is_office() and not is_system() then
    raise exception 'Your role can''t create sales.' using errcode = '42501';
  end if;

  if p_client_ref is not null then
    perform pg_advisory_xact_lock(hashtext('sale:' || p_client_ref::text));
    select * into v_existing from agreements where client_ref = p_client_ref;
    if found then
      return jsonb_build_object(
        'agreement_id', v_existing.id, 'agreement_no', v_existing.agreement_no,
        'customer_id', v_existing.customer_id,
        'receipt_id', (select id from receipts where client_ref = p_client_ref),
        'avo_name', (select p.full_name from verifications v join profiles p on p.id = v.avo_id
                      where v.agreement_id = v_existing.id limit 1),
        'duplicate', true);
    end if;
  end if;

  -- ---- validate the sale ----
  if p_plan is not null and p_plan not in (10, 12) then
    raise exception 'Choose a 10 or 12 month plan.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one product.';
  end if;
  if v_advance < 0 then raise exception 'Advance can''t be negative.'; end if;

  v_total := 0;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'Every product needs a quantity of at least 1.'; end if;
    if v_price is null or v_price < 0 then raise exception 'Every product needs a price.'; end if;
    v_total := v_total + v_qty * v_price;
  end loop;
  if v_total <= 0 then raise exception 'Sale total must be greater than zero.'; end if;

  if v_sale = 'installment' then
    v_financed := v_total - v_advance;
    if v_financed <= 0 then
      raise exception 'The advance covers the whole price — record this as a direct sale.';
    end if;
    v_monthly := round(v_financed / p_plan);
    if v_monthly <= 0 then raise exception 'Amount left after the advance is too small for a % month plan.', p_plan; end if;
  end if;

  -- ---- customer ----
  if p_customer_id is null then
    if p_new_customer is null
       or trim(coalesce(p_new_customer->>'full_name', '')) = ''
       or trim(coalesce(p_new_customer->>'cell', '')) = '' then
      raise exception 'Customer name and cell number are required.';
    end if;
    v_avo := nullif(p_new_customer->>'avo_id', '')::uuid;
    if v_avo is null and v_sale = 'installment' then v_avo := least_loaded_avo(); end if;

    insert into customers (full_name, father_name, cnic, cell, cell2, address, area, occupation, avo_id, created_by)
    values (trim(p_new_customer->>'full_name'),
            nullif(trim(p_new_customer->>'father_name'), ''),
            nullif(trim(p_new_customer->>'cnic'), ''),
            trim(p_new_customer->>'cell'),
            nullif(trim(p_new_customer->>'cell2'), ''),
            nullif(trim(p_new_customer->>'address'), ''),
            nullif(trim(p_new_customer->>'area'), ''),
            nullif(trim(p_new_customer->>'occupation'), ''),
            v_avo, auth.uid())
    returning id into v_cust;
  else
    select id, blacklisted, avo_id into v_cust, v_blacklisted, v_avo
      from customers where id = p_customer_id for update;
    if not found then raise exception 'Customer not found.'; end if;
    if v_blacklisted and v_sale = 'installment' then
      raise exception 'This customer is blacklisted — installment sales are blocked.';
    end if;
    if v_avo is null and v_sale = 'installment' then
      v_avo := least_loaded_avo();
      update customers set avo_id = v_avo where id = v_cust;
    end if;
  end if;

  -- ---- guarantors ----
  if v_sale = 'installment' and p_guarantors is not null then
    for v_g in select * from jsonb_array_elements(p_guarantors) loop
      if trim(coalesce(v_g->>'full_name', '')) = '' then raise exception 'Guarantor name is required.'; end if;
      insert into guarantors (customer_id, slot, full_name, cnic, cell, relation, address)
      values (v_cust, (v_g->>'slot')::smallint, trim(v_g->>'full_name'),
              nullif(trim(v_g->>'cnic'), ''), nullif(trim(v_g->>'cell'), ''),
              nullif(trim(v_g->>'relation'), ''), nullif(trim(v_g->>'address'), ''))
      on conflict (customer_id, slot) do update
        set full_name = excluded.full_name, cnic = excluded.cnic, cell = excluded.cell,
            relation = excluded.relation, address = excluded.address;
    end loop;
  end if;

  -- ---- agreement ----
  insert into agreements (customer_id, sale_type, plan_months, total_price, advance, monthly,
                          opened_on, first_due, status, closed_on, sales_officer_id, client_ref)
  values (v_cust, v_sale, p_plan, v_total,
          case when v_sale = 'installment' then v_advance else 0 end,
          v_monthly, v_today,
          case when v_sale = 'installment' then v_first end,
          case when v_sale = 'direct' then 'closed'::agreement_state else 'pending_verification'::agreement_state end,
          case when v_sale = 'direct' then v_today end,
          auth.uid(), p_client_ref)
  returning id, agreement_no into v_id, v_no;

  -- ---- items + stock (5: no overselling) ----
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    select stock, name into v_stock, v_pname from products
     where id = (v_item->>'product_id')::uuid for update;
    if not found then raise exception 'Product not found.'; end if;
    if v_stock < v_qty then
      raise exception 'Not enough stock for % — only % left.', v_pname, greatest(v_stock, 0);
    end if;
    update products set stock = stock - v_qty where id = (v_item->>'product_id')::uuid;
    insert into agreement_items (agreement_id, product_id, qty, unit_price, serial_no)
    values (v_id, (v_item->>'product_id')::uuid, v_qty, (v_item->>'unit_price')::numeric, v_item->>'serial_no');
  end loop;

  -- ---- schedule ----
  if v_sale = 'installment' then
    -- installment 1 is collected today with the advance
    insert into installments (agreement_id, seq, due_month, due_amount, paid, status)
    values (v_id, 1, date_trunc('month', v_today)::date, v_monthly, v_monthly, 'paid')
    returning id into v_inst1;
    for i in 2..p_plan loop
      insert into installments (agreement_id, seq, due_month, due_amount)
      values (v_id, i, (v_first + ((i - 2) || ' months')::interval)::date,
              -- last installment absorbs rounding so advance + Σ installments = total
              case when i = p_plan then v_financed - v_monthly * (p_plan - 1) else v_monthly end);
    end loop;
  end if;

  -- ---- 1b: the signing-day money is a real receipt ----
  v_collect := case when v_sale = 'direct' then v_total else v_advance + v_monthly end;
  insert into receipts (agreement_id, installment_id, customer_id, amount, mode, account, collected_by, notes, client_ref)
  values (v_id, v_inst1, v_cust, v_collect, coalesce(p_mode, 'cash'), coalesce(p_account, 'cash_in_hand'), auth.uid(),
          case when v_sale = 'direct' then 'Direct sale — full payment'
               else 'At signing — advance + installment 1' end,
          p_client_ref)
  returning id into v_receipt;

  -- ---- verification ----
  if v_sale = 'installment' and v_avo is not null then
    insert into verifications (customer_id, agreement_id, avo_id, status)
    values (v_cust, v_id, v_avo, 'pending');
    select full_name into v_avo_name from profiles where id = v_avo;
  end if;

  return jsonb_build_object(
    'agreement_id', v_id, 'agreement_no', v_no, 'customer_id', v_cust,
    'receipt_id', v_receipt, 'avo_name', v_avo_name, 'duplicate', false);
end $$;

-- =====================================================================
-- 1c / 1d / 1e / 2c / 3b / 5. Receipt posting.
--
-- 1d: carry-forward moves the shortfall instead of copying it. The short row
--     is topped off to exactly due_amount + carry_in (its own remaining is 0)
--     in the same statement that adds the gap to the next row's carry_in.
--     Invariant: Σ(due_amount + carry_in − paid) over an agreement is exactly
--     what the customer still owes — counted once.
-- 1e: paying more than the agreement's outstanding balance is refused.
-- 3b: p_client_ref makes retries (offline queue, lost responses) a no-op.
-- 5:  only open agreements accept collections.
-- =====================================================================

drop function if exists post_receipt(uuid, numeric, pay_mode, money_account, double precision, double precision);

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

  if v_role = 'avo' and not exists (
    select 1 from customers where id = v_agr.customer_id and avo_id = auth.uid()) then
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

-- Repair rows already written by the old post_receipt: a forwarded
-- shortfall/credit was left on the row it came from as well. Only rows that
-- have a next installment were ever forwarded.
update installments i
   set paid = i.due_amount + i.carry_in
 where i.status = 'paid'
   and i.paid <> i.due_amount + i.carry_in
   and exists (select 1 from installments n where n.agreement_id = i.agreement_id and n.seq = i.seq + 1);

-- =====================================================================
-- 4a. Verification. The AVO's house visit is the single approval authority
-- (README business rule 6). Approval needs at least one house photo.
-- Owner/manager can reject at any stage as an override; rejection cancels
-- exactly the agreement the verification belongs to and puts stock back.
-- =====================================================================

create or replace function open_or_cancel_for_verification(p_verification uuid, p_open boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_ver verifications; v_agr agreements;
begin
  select * into v_ver from verifications where id = p_verification;
  select * into v_agr from agreements where id = v_ver.agreement_id for update;
  if not found then
    -- legacy row without agreement_id: the customer's pending agreement
    select * into v_agr from agreements
     where customer_id = v_ver.customer_id and status = 'pending_verification'
     order by created_at desc limit 1 for update;
  end if;
  if v_agr.id is null then return; end if;

  if p_open then
    if v_agr.status = 'pending_verification' then
      update agreements set status = 'open' where id = v_agr.id;
    end if;
  elsif v_agr.status in ('pending_verification', 'open') then
    -- the signing receipt is written in the same transaction as the agreement,
    -- so it shares created_at exactly; anything later is a field collection
    if exists (select 1 from receipts r where r.agreement_id = v_agr.id
                and r.collected_at > v_agr.created_at) then
      raise exception 'Agreement #% already has collections after signing — settle it from the ledger instead of cancelling.',
        v_agr.agreement_no;
    end if;
    update agreements set status = 'cancelled', closed_on = shop_today() where id = v_agr.id;
    update products p set stock = p.stock + ai.qty
      from agreement_items ai where ai.agreement_id = v_agr.id and ai.product_id = p.id;
  end if;
end $$;
revoke execute on function open_or_cancel_for_verification(uuid, boolean) from public;

-- AVO submits the house visit with a decision.
create or replace function submit_visit(
  p_verification uuid, p_approve boolean, p_house_type text, p_notes text,
  p_photo_paths text[], p_lat double precision, p_lng double precision
) returns void language plpgsql security definer set search_path = public as $$
declare v_ver verifications; v_photos text[];
begin
  select * into v_ver from verifications where id = p_verification for update;
  if not found then raise exception 'Verification not found.'; end if;
  if v_ver.avo_id is distinct from auth.uid() and coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'This house visit isn''t assigned to you.' using errcode = '42501';
  end if;
  if my_role() is null then raise exception 'Your login is not active.' using errcode = '42501'; end if;
  if v_ver.status <> 'pending' then
    raise exception 'This verification was already %.', v_ver.status;
  end if;

  v_photos := coalesce(v_ver.photo_paths, '{}') || coalesce(p_photo_paths, '{}');
  if p_approve and coalesce(array_length(v_photos, 1), 0) = 0 then
    raise exception 'Take at least one house photo before approving.';
  end if;

  update verifications
     set status = case when p_approve then 'approved'::verify_state else 'rejected'::verify_state end,
         house_type = nullif(trim(p_house_type), ''),
         notes = nullif(trim(p_notes), ''),
         photo_paths = v_photos,
         lat = p_lat, lng = p_lng,
         visited_at = now()
   where id = p_verification;

  perform open_or_cancel_for_verification(p_verification, p_approve);
end $$;

-- Kept for compatibility; same rules as an approving submit_visit.
create or replace function approve_verification(p_verification uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_ver verifications;
begin
  select * into v_ver from verifications where id = p_verification for update;
  if not found then raise exception 'Verification not found.'; end if;
  if v_ver.avo_id is distinct from auth.uid() and coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the assigned AVO can approve this house visit.' using errcode = '42501';
  end if;
  if v_ver.status <> 'pending' then raise exception 'This verification was already %.', v_ver.status; end if;
  if coalesce(array_length(v_ver.photo_paths, 1), 0) = 0 then
    raise exception 'Take at least one house photo before approving.';
  end if;
  update verifications set status = 'approved', visited_at = coalesce(visited_at, now()) where id = p_verification;
  perform open_or_cancel_for_verification(p_verification, true);
end $$;

-- Owner/manager override: reachable whatever the current status.
create or replace function reject_verification(p_verification uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only an owner or manager can reject a verification.' using errcode = '42501';
  end if;
  perform 1 from verifications where id = p_verification for update;
  if not found then raise exception 'Verification not found.'; end if;
  update verifications
     set status = 'rejected',
         notes = concat_ws(E'\n', notes, 'Rejected by office' || coalesce(': ' || nullif(trim(p_reason), ''), ''))
   where id = p_verification;
  perform open_or_cancel_for_verification(p_verification, false);
end $$;

-- =====================================================================
-- 4b / 4c. Status logic on the shop clock, plus a heartbeat for the daily job.
-- =====================================================================

create table if not exists job_runs (
  job         text primary key,
  last_run_at timestamptz not null
);
alter table job_runs enable row level security;
create policy office_read on job_runs for select using (is_office());

create or replace function mark_installment_statuses() returns void
language plpgsql as $$
declare v_today date := shop_today(); v_month date := date_trunc('month', shop_today())::date;
begin
  -- self-heal: anything fully paid is paid, whatever the column said
  update installments set status = 'paid'::inst_state
   where status <> 'paid' and paid >= due_amount + carry_in;

  update installments i
     set status = 'overdue'::inst_state
    from agreements a
   where i.agreement_id = a.id
     and a.status = 'open'
     and i.status not in ('paid', 'overdue')
     and (i.due_month < v_month or (i.due_month = v_month and extract(day from v_today) > 5));

  update installments i
     set status = 'due'::inst_state
    from agreements a
   where i.agreement_id = a.id
     and a.status = 'open'
     and i.status = 'upcoming'
     and i.due_month = v_month
     and extract(day from v_today) <= 5;

  insert into job_runs (job, last_run_at) values ('mark_installment_statuses', now())
  on conflict (job) do update set last_run_at = excluded.last_run_at;
end $$;

-- pg_cron runs in UTC: 19:05 UTC = 00:05 Asia/Karachi.
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- same job name: pg_cron replaces the 0005 schedule
    perform cron.schedule('mark-installment-statuses', '5 19 * * *', 'select mark_installment_statuses()');
  end if;
end $$;

create or replace function queue_month_reminders() returns integer
language plpgsql as $$
declare
  v_next date := (date_trunc('month', shop_today()) + interval '1 month')::date;
  v_count integer;
begin
  with due_next_month as (
    select a.customer_id, sum(i.due_amount + i.carry_in - i.paid) as due_amount
      from installments i
      join agreements a on a.id = i.agreement_id and a.status = 'open'
     where i.due_month = v_next and i.status <> 'paid'
     group by a.customer_id
  ),
  inserted as (
    insert into messages (customer_id, channel, template, body, status)
    select c.id, t.channel, 'reminder',
           replace(replace(replace(t.body, '{{name}}', c.full_name), '{{amount}}', d.due_amount::text), '{{month}}', to_char(v_next, 'Mon YYYY')),
           'queued'
      from due_next_month d
      join customers c on c.id = d.customer_id
      cross join message_templates t
     where t.key = 'reminder' and d.due_amount > 0
       and not exists (
         select 1 from messages m
          where m.customer_id = c.id and m.template = 'reminder'
            and (m.created_at at time zone 'Asia/Karachi')::date = shop_today()
       )
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end $$;

create or replace function queue_overdue_messages() returns integer
language plpgsql as $$
declare v_count integer;
begin
  with inserted as (
    insert into messages (customer_id, channel, template, body, status)
    select s.customer_id, t.channel, 'overdue',
           replace(replace(t.body, '{{name}}', s.full_name), '{{amount}}', greatest(s.due_now, 0)::text),
           'queued'
      from customer_month_status s
      cross join message_templates t
     where t.key = 'overdue'
       and s.status in ('overdue', 'default')
       and not exists (
         select 1 from messages m
          where m.customer_id = s.customer_id and m.template = 'overdue'
            and (m.created_at at time zone 'Asia/Karachi')::date = shop_today()
       )
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end $$;

-- Same view as 0002, on the shop clock. Amount math is unchanged; with 1d
-- fixed, Σ(due_amount + carry_in − paid) no longer double-counts.
create or replace view customer_month_status
with (security_invoker = true) as
with cur as (
  select a.customer_id, i.*, a.plan_months
    from installments i join agreements a on a.id = i.agreement_id
   where a.status = 'open'
),
agg as (
  select customer_id,
         date_trunc('month', shop_today())::date as month,
         sum(due_amount + carry_in - paid) filter (where due_month <= date_trunc('month', shop_today())) as due_now,
         count(*) filter (where due_month < date_trunc('month', shop_today()) and paid < due_amount + carry_in) as months_behind,
         sum(due_amount) filter (where due_month = date_trunc('month', shop_today())) as monthly_total,
         sum(due_amount + carry_in - paid) as remaining,
         max(carry_in) filter (where due_month = date_trunc('month', shop_today())) as carry
    from cur group by customer_id
)
select c.id as customer_id, c.acc_no, c.full_name, c.cell, c.cnic, c.area, c.avo_id,
       g1.full_name as g1_name, g1.cell as g1_cell, g1.cnic as g1_cnic,
       g2.full_name as g2_name, g2.cell as g2_cell, g2.cnic as g2_cnic,
       agg.monthly_total, agg.due_now, agg.remaining, agg.carry, agg.months_behind,
       case
         when coalesce(agg.due_now,0) <= 0 then 'paid'
         when agg.months_behind >= 2 then 'default'
         when agg.months_behind = 1 or extract(day from shop_today()) > 5 then 'overdue'
         when coalesce(agg.carry,0) > 0 then 'short'
         else 'due'
       end as status
  from customers c
  join agg on agg.customer_id = c.id
  left join guarantors g1 on g1.customer_id = c.id and g1.slot = 1
  left join guarantors g2 on g2.customer_id = c.id and g2.slot = 2;

-- =====================================================================
-- Function privileges: nothing is callable without a login. Internal
-- helpers are not callable through the API at all.
-- =====================================================================

revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated, service_role;
revoke execute on function open_or_cancel_for_verification(uuid, boolean) from authenticated;
revoke execute on function mark_installment_statuses() from authenticated;
revoke execute on function queue_month_reminders()     from authenticated;
revoke execute on function queue_overdue_messages()    from authenticated;
