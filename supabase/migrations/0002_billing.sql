-- Billing logic: agreement creation, receipt posting with carry-forward, status, closing.

-- Create an agreement and its installment schedule in one call.
-- Business rule: at signing the customer pays advance + month 1.
-- For a 12 month plan, 11 installments remain, due on the 1st of each following month.
create or replace function create_agreement(
  p_customer uuid, p_sale sale_type, p_plan smallint,
  p_items jsonb,               -- [{product_id, qty, unit_price, serial_no}]
  p_advance numeric, p_officer uuid
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid; v_total numeric; v_monthly numeric; v_first date; i int; v_item jsonb;
begin
  select coalesce(sum((x->>'qty')::int * (x->>'unit_price')::numeric),0)
    into v_total from jsonb_array_elements(p_items) x;

  v_monthly := case when p_sale = 'installment' then round(v_total / p_plan) else 0 end;
  v_first   := (date_trunc('month', current_date) + interval '1 month')::date;

  insert into agreements (customer_id, sale_type, plan_months, total_price, advance, monthly, first_due, sales_officer_id,
                          status)
  values (p_customer, p_sale, p_plan, v_total, p_advance, v_monthly, v_first, p_officer,
          case when p_sale = 'direct' then 'closed'::agreement_state else 'pending_verification'::agreement_state end)
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into agreement_items (agreement_id, product_id, qty, unit_price, serial_no)
    values (v_id, (v_item->>'product_id')::uuid, (v_item->>'qty')::int, (v_item->>'unit_price')::numeric, v_item->>'serial_no');
    update products set stock = stock - (v_item->>'qty')::int where id = (v_item->>'product_id')::uuid;
  end loop;

  if p_sale = 'installment' then
    -- seq 1 is collected today with the advance
    insert into installments (agreement_id, seq, due_month, due_amount, paid, status)
    values (v_id, 1, date_trunc('month', current_date)::date, v_monthly, v_monthly, 'paid');
    for i in 2..p_plan loop
      insert into installments (agreement_id, seq, due_month, due_amount)
      values (v_id, i, (v_first + ((i-2) || ' months')::interval)::date,
              -- last installment absorbs rounding so the sum equals total
              case when i = p_plan then v_total - v_monthly * (p_plan - 1) else v_monthly end);
    end loop;
  end if;

  return v_id;
end $$;

-- Post a receipt against the oldest open installment of an agreement.
-- Shortfall carries into the next installment; overpayment becomes a negative carry (credit).
create or replace function post_receipt(
  p_agreement uuid, p_amount numeric, p_mode pay_mode, p_account money_account,
  p_lat double precision default null, p_lng double precision default null
) returns uuid language plpgsql security definer as $$
declare
  v_inst installments; v_next installments; v_owed numeric; v_gap numeric; v_receipt uuid; v_cust uuid;
begin
  select customer_id into v_cust from agreements where id = p_agreement;

  select * into v_inst from installments
   where agreement_id = p_agreement and status <> 'paid'
   order by seq limit 1 for update;
  if not found then raise exception 'Agreement has no open installments'; end if;

  v_owed := v_inst.due_amount + v_inst.carry_in - v_inst.paid;
  v_gap  := v_owed - p_amount;           -- >0 short, <0 extra

  update installments
     set paid = paid + p_amount,
         status = case when v_gap > 0 then 'short'::inst_state else 'paid'::inst_state end
   where id = v_inst.id;

  if v_gap <> 0 then
    select * into v_next from installments
     where agreement_id = p_agreement and seq = v_inst.seq + 1 for update;
    if found then
      update installments set carry_in = carry_in + v_gap where id = v_next.id;
      -- the short row is now settled by moving its balance forward
      update installments set status = 'paid' where id = v_inst.id and v_gap > 0;
    end if;
  end if;

  insert into receipts (agreement_id, installment_id, customer_id, amount, mode, account, collected_by, lat, lng)
  values (p_agreement, v_inst.id, v_cust, p_amount, p_mode, p_account, auth.uid(), p_lat, p_lng)
  returning id into v_receipt;

  -- close when fully paid
  if not exists (select 1 from installments where agreement_id = p_agreement and status <> 'paid') then
    update agreements set status = 'closed', closed_on = current_date where id = p_agreement;
  end if;

  return v_receipt;
end $$;

-- Customer status for a given month, across ALL their open agreements.
-- paid | short | due | overdue | default   (window = 1st–5th)
create or replace view customer_month_status as
with cur as (
  select a.customer_id, i.*, a.plan_months
    from installments i join agreements a on a.id = i.agreement_id
   where a.status = 'open'
),
agg as (
  select customer_id,
         date_trunc('month', current_date)::date as month,
         sum(due_amount + carry_in - paid) filter (where due_month <= date_trunc('month', current_date)) as due_now,
         count(*) filter (where due_month < date_trunc('month', current_date) and paid < due_amount + carry_in) as months_behind,
         sum(due_amount) filter (where due_month = date_trunc('month', current_date)) as monthly_total,
         sum(due_amount + carry_in - paid) as remaining,
         max(carry_in) filter (where due_month = date_trunc('month', current_date)) as carry
    from cur group by customer_id
)
select c.id as customer_id, c.acc_no, c.full_name, c.cell, c.cnic, c.area, c.avo_id,
       g1.full_name as g1_name, g1.cell as g1_cell, g1.cnic as g1_cnic,
       g2.full_name as g2_name, g2.cell as g2_cell, g2.cnic as g2_cnic,
       agg.monthly_total, agg.due_now, agg.remaining, agg.carry, agg.months_behind,
       case
         when coalesce(agg.due_now,0) <= 0 then 'paid'
         when agg.months_behind >= 2 then 'default'
         when agg.months_behind = 1 or extract(day from current_date) > 5 then 'overdue'
         when coalesce(agg.carry,0) > 0 then 'short'
         else 'due'
       end as status
  from customers c
  join agg on agg.customer_id = c.id
  left join guarantors g1 on g1.customer_id = c.id and g1.slot = 1
  left join guarantors g2 on g2.customer_id = c.id and g2.slot = 2;

-- Approving a verification opens the agreement
create or replace function approve_verification(p_verification uuid) returns void
language plpgsql security definer as $$
declare v_cust uuid;
begin
  update verifications set status = 'approved', visited_at = coalesce(visited_at, now())
   where id = p_verification returning customer_id into v_cust;
  update agreements set status = 'open'
   where customer_id = v_cust and status = 'pending_verification';
end $$;

-- Stock in on purchase
create or replace function on_purchase_item() returns trigger language plpgsql as $$
begin
  update products set stock = stock + new.qty, cost = new.unit_cost where id = new.product_id;
  update purchases set total = total + new.qty * new.unit_cost where id = new.purchase_id;
  return new;
end $$;
create trigger trg_purchase_item after insert on purchase_items for each row execute function on_purchase_item();

-- Queue a WhatsApp "received" message on every receipt
create or replace function on_receipt_msg() returns trigger language plpgsql as $$
begin
  insert into messages (customer_id, channel, template, body)
  select new.customer_id, 'whatsapp', 'received',
         replace(replace(t.body, '{{amount}}', new.amount::text), '{{name}}', c.full_name)
    from message_templates t, customers c
   where t.key = 'received' and c.id = new.customer_id;
  return new;
end $$;
create trigger trg_receipt_msg after insert on receipts for each row execute function on_receipt_msg();
