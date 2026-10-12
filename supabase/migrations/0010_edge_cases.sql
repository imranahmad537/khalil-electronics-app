-- Edge-case fixes from the full-project review.

-- =====================================================================
-- Messages: reliable sending (no double sends, retries, recorded errors)
-- and reminders queued server-side (deduplicated, AVO-safe, real amounts).
-- =====================================================================

alter table messages add column if not exists attempts     smallint not null default 0;
alter table messages add column if not exists last_error   text;
alter table messages add column if not exists locked_until timestamptz;

-- The sender claims a batch atomically: two overlapping runs can never pick
-- the same message. A claim expires after 10 minutes in case a run crashes.
create or replace function claim_queued_messages(p_limit int default 100)
returns table (id uuid, channel msg_channel, body text, cell text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with picked as (
    select m.id from messages m
     where m.status = 'queued' and (m.locked_until is null or m.locked_until < now())
     order by m.created_at
     limit greatest(1, least(p_limit, 500))
     for update skip locked
  ), claimed as (
    update messages m set locked_until = now() + interval '10 minutes', attempts = m.attempts + 1
      from picked where m.id = picked.id
    returning m.id, m.channel, m.body, m.customer_id
  )
  select c.id, c.channel, c.body, cu.cell from claimed c left join customers cu on cu.id = c.customer_id;
end $$;

-- After a send attempt: sent, or back in the queue (up to 3 tries), or failed.
create or replace function finish_message(p_id uuid, p_ok boolean, p_provider_id text, p_error text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update messages
     set status = case when p_ok then 'sent'::msg_state
                       when attempts >= 3 then 'failed'::msg_state
                       else 'queued'::msg_state end,
         provider_id = coalesce(p_provider_id, provider_id),
         sent_at = case when p_ok then now() else sent_at end,
         last_error = case when p_ok then null else left(p_error, 500) end,
         locked_until = case when p_ok or attempts >= 3 then null else now() + interval '30 minutes' end  -- back off before retrying
   where id = p_id;
end $$;

-- Queue payment reminders. Amounts come from customer_month_status (never
-- from the browser), customers with nothing due are skipped, a customer gets
-- at most one reminder per shop day, and an AVO may remind only their own
-- customers.
create or replace function queue_reminders(p_customers uuid[], p_month_label text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_role user_role := my_role(); v_count integer;
begin
  if v_role is null then raise exception 'Your login is not active.' using errcode = '42501'; end if;
  with targets as (
    select s.customer_id, s.full_name, greatest(s.due_now, 0) as due
      from customer_month_status s
      join customers c on c.id = s.customer_id
     where s.customer_id = any(p_customers)
       and coalesce(s.due_now, 0) > 0
       and (v_role <> 'avo' or c.avo_id = auth.uid())
       and not exists (select 1 from messages m
                        where m.customer_id = s.customer_id and m.template = 'reminder'
                          and (m.created_at at time zone 'Asia/Karachi')::date = shop_today())
  ), inserted as (
    insert into messages (customer_id, channel, template, body, status)
    select t.customer_id, tpl.channel, 'reminder',
           replace(replace(replace(tpl.body, '{{name}}', t.full_name), '{{amount}}', to_char(t.due, 'FM999,999,999')), '{{month}}', coalesce(p_month_label, '')),
           'queued'
      from targets t cross join message_templates tpl
     where tpl.key = 'reminder'
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end $$;

-- =====================================================================
-- Purchases: header + items in one transaction (no empty Rs 0 bills).
-- =====================================================================

create or replace function create_purchase(p_vendor uuid, p_bill_no text, p_bill_date date, p_notes text, p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_item jsonb;
begin
  if coalesce(my_role() in ('owner','manager','accountant'), false) = false then
    raise exception 'Your role doesn''t have access to purchases.' using errcode = '42501';
  end if;
  if not exists (select 1 from vendors where id = p_vendor) then raise exception 'Choose a vendor.'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Add at least one item.'; end if;
  if p_bill_date > shop_today() then raise exception 'The bill date can''t be in the future.'; end if;

  insert into purchases (vendor_id, bill_no, bill_date, notes)
  values (p_vendor, nullif(trim(p_bill_no), ''), coalesce(p_bill_date, shop_today()), nullif(trim(p_notes), ''))
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'qty')::int, 0) <= 0 then raise exception 'Every item needs a quantity of at least 1.'; end if;
    if coalesce((v_item->>'unit_cost')::numeric, -1) < 0 then raise exception 'Every item needs a cost.'; end if;
    -- on_purchase_item trigger adds stock, updates cost and the bill total
    insert into purchase_items (purchase_id, product_id, qty, unit_cost)
    values (v_id, (v_item->>'product_id')::uuid, (v_item->>'qty')::int, (v_item->>'unit_cost')::numeric);
  end loop;
  return v_id;
end $$;

-- =====================================================================
-- Payroll expenses can't be edited or deleted on their own — the payslip
-- would no longer match. Undo the payment from Payroll instead (which
-- removes the payslip first, so this check passes there).
-- =====================================================================

create or replace function guard_payroll_expense() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from payslips where expense_id = old.id) then
    raise exception 'This expense was created by Payroll — undo the salary payment from Payroll instead.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_guard_payroll_expense on expenses;
create trigger trg_guard_payroll_expense before update or delete on expenses
  for each row execute function guard_payroll_expense();

-- =====================================================================
-- Customer reassignment moves their pending house visits too (otherwise a
-- visit assigned to a departed AVO is stuck forever), and only to an active AVO.
-- =====================================================================

create or replace function assign_customers(p_customers uuid[], p_avo uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if not is_office() then raise exception 'Your role can''t reassign customers.' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = p_avo and role = 'avo' and active) then
    raise exception 'Choose an active field officer.';
  end if;
  update customers set avo_id = p_avo where id = any(p_customers);
  get diagnostics v_count = row_count;
  update verifications set avo_id = p_avo where customer_id = any(p_customers) and status = 'pending';
  return v_count;
end $$;

-- =====================================================================
-- Blacklisting is an owner/manager decision.
-- =====================================================================

create or replace function guard_blacklist() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.blacklisted is distinct from old.blacklisted and not is_system()
     and coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can blacklist a customer.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_blacklist on customers;
create trigger trg_guard_blacklist before update on customers for each row execute function guard_blacklist();

-- =====================================================================
-- Cancel a sale after collections have started (customer returns the item,
-- fraud found later…). Records any refund as money out, puts stock back,
-- closes the house visit. Owner/manager only.
-- =====================================================================

create or replace function cancel_sale(p_agreement uuid, p_refund numeric, p_account money_account, p_reason text, p_restock boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_agr agreements; v_received numeric; v_name text;
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can cancel a sale.' using errcode = '42501';
  end if;
  if trim(coalesce(p_reason, '')) = '' then raise exception 'Give a reason for cancelling.'; end if;

  select * into v_agr from agreements where id = p_agreement for update;
  if not found then raise exception 'Agreement not found.'; end if;
  if v_agr.status not in ('open', 'pending_verification') then
    raise exception 'Agreement #% is already %.', v_agr.agreement_no, v_agr.status;
  end if;

  select coalesce(sum(amount), 0) into v_received from receipts where agreement_id = p_agreement;
  if coalesce(p_refund, 0) < 0 or coalesce(p_refund, 0) > v_received then
    raise exception 'The refund must be between Rs 0 and the Rs % received on this agreement.', v_received;
  end if;

  update agreements set status = 'cancelled', closed_on = shop_today() where id = p_agreement;
  if p_restock then
    update products p set stock = p.stock + ai.qty from agreement_items ai where ai.agreement_id = p_agreement and ai.product_id = p.id;
  end if;
  update verifications
     set status = 'rejected', notes = concat_ws(E'\n', notes, 'Sale cancelled: ' || trim(p_reason))
   where agreement_id = p_agreement and status = 'pending';

  if coalesce(p_refund, 0) > 0 then
    select full_name into v_name from customers where id = v_agr.customer_id;
    insert into expenses (category, description, amount, account, spent_on, created_by)
    values ('Customer refund', format('Refund — %s — agreement #%s — %s', v_name, v_agr.agreement_no, trim(p_reason)),
            p_refund, p_account, shop_today(), auth.uid());
  end if;
end $$;

-- =====================================================================
-- Leavers: an employee who leaves mid-month still appears in that month's
-- attendance and payroll (for the final salary); days after leaving aren't paid.
-- =====================================================================

alter table employees add column if not exists left_on date;

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

  update employees
     set active = p_active,
         left_on = case when p_active then null else coalesce(left_on, shop_today()) end
   where id = p_employee;
  if v_profile is not null then
    update profiles set active = p_active where id = v_profile;
  end if;
  return v_profile;
end $$;

drop function if exists attendance_staff();
create or replace function attendance_staff(p_from date default null)
returns table (id uuid, full_name text, role user_role, joined_on date, left_on date, has_login boolean, salary numeric)
language sql stable security definer set search_path = public as $$
  select e.id, e.full_name, e.role, e.joined_on, e.left_on, e.profile_id is not null,
         -- salary only for those who may see payroll
         case when my_role() in ('owner','manager') then e.salary end
    from employees e
   where coalesce(my_role() in ('owner','manager','accountant'), false)
     and (e.active or (p_from is not null and e.left_on >= p_from))
   order by e.full_name
$$;

revoke execute on function claim_queued_messages(int) from public, anon, authenticated;
revoke execute on function finish_message(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function claim_queued_messages(int) to service_role;
grant execute on function finish_message(uuid, boolean, text, text) to service_role;
revoke execute on function queue_reminders(uuid[], text) from public, anon;
revoke execute on function create_purchase(uuid, text, date, text, jsonb) from public, anon;
revoke execute on function assign_customers(uuid[], uuid) from public, anon;
revoke execute on function cancel_sale(uuid, numeric, money_account, text, boolean) from public, anon;
revoke execute on function attendance_staff(date) from public, anon;
grant execute on function queue_reminders(uuid[], text) to authenticated, service_role;
grant execute on function create_purchase(uuid, text, date, text, jsonb) to authenticated, service_role;
grant execute on function assign_customers(uuid[], uuid) to authenticated, service_role;
grant execute on function cancel_sale(uuid, numeric, money_account, text, boolean) to authenticated, service_role;
grant execute on function attendance_staff(date) to authenticated, service_role;

-- Point the rejection message at the new Cancel sale button.
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
      raise exception 'Agreement #% already has collections after signing — open the customer''s ledger and use "Cancel sale" (it records any refund).',
        v_agr.agreement_no;
    end if;
    update agreements set status = 'cancelled', closed_on = shop_today() where id = v_agr.id;
    update products p set stock = p.stock + ai.qty
      from agreement_items ai where ai.agreement_id = v_agr.id and ai.product_id = p.id;
  end if;
end $$;
revoke execute on function open_or_cancel_for_verification(uuid, boolean) from public, anon, authenticated;
