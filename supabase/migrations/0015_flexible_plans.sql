-- Flexible plan lengths: the shop now offers 6, 8, 10 and 12 month plans.
-- The database accepts any plan of 2–24 months; which lengths are offered at
-- the counter is decided in the app (lib/plans.ts), so adding one later needs
-- no migration.

alter table agreements drop constraint if exists agreements_plan_months_check;
alter table agreements add constraint agreements_plan_months_check
  check (plan_months is null or plan_months between 2 and 24);

-- create_sale: same as 0014, with the plan check widened to 2–24 months.
create or replace function create_sale(
  p_client_ref   uuid,
  p_customer_id  uuid,          -- existing customer, or null to create p_new_customer
  p_new_customer jsonb,         -- {full_name, father_name, cnic, cell, cell2, address, area, occupation, avo_id}
  p_guarantors   jsonb,         -- null keeps the customer's existing guarantors; else the full list [{slot 1–4, full_name, cnic, cell, relation, address}]
  p_items        jsonb,         -- [{product_id, qty, unit_price, serial_no}]
  p_plan         smallint,      -- 2–24 months for an installment sale, null for a direct sale
  p_advance      numeric,
  p_mode         pay_mode,
  p_account      money_account,
  p_no_guarantor_reason text default null  -- required when p_guarantors is []
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
  v_slot smallint; v_slots smallint[] := '{}'; v_reason text := nullif(trim(coalesce(p_no_guarantor_reason, '')), '');
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
  if p_plan is not null and p_plan not between 2 and 24 then
    raise exception 'Choose a plan of 2 to 24 months.';
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
    if jsonb_typeof(p_guarantors) <> 'array' then raise exception 'Guarantors must be a list.'; end if;
    if jsonb_array_length(p_guarantors) > 4 then raise exception 'At most 4 guarantors per customer.'; end if;
    if jsonb_array_length(p_guarantors) = 0 and v_reason is null then
      raise exception 'Add at least one guarantor, or record why none is needed.';
    end if;

    for v_g in select * from jsonb_array_elements(p_guarantors) loop
      v_slot := (v_g->>'slot')::smallint;
      if v_slot is null or v_slot not between 1 and 4 then raise exception 'Guarantor slot must be 1 to 4.'; end if;
      if v_slot = any(v_slots) then raise exception 'Guarantor % is listed twice.', v_slot; end if;
      v_slots := v_slots || v_slot;
    end loop;
    -- the list replaces what's on file: drop guarantors no longer named
    delete from guarantors where customer_id = v_cust and not (slot = any(v_slots));

    update customers
       set no_guarantor_reason = case when jsonb_array_length(p_guarantors) = 0 then v_reason end
     where id = v_cust;

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
  elsif v_sale = 'installment' then
    -- reusing what's on file: there must be a guarantor or a recorded waiver
    if not exists (select 1 from guarantors where customer_id = v_cust)
       and (select no_guarantor_reason from customers where id = v_cust) is null then
      raise exception 'This customer has no guarantor on file — add one, or record why none is needed.';
    end if;
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
