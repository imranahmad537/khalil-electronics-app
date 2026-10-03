-- Row Level Security. Office roles see everything; AVOs only their assigned customers.

create or replace function my_role() returns user_role language sql stable as $$
  select role from profiles where id = auth.uid()
$$;
create or replace function is_office() returns boolean language sql stable as $$
  select my_role() in ('owner','manager','accountant','sales')
$$;

alter table customers       enable row level security;
alter table guarantors      enable row level security;
alter table agreements      enable row level security;
alter table agreement_items enable row level security;
alter table installments    enable row level security;
alter table receipts        enable row level security;
alter table verifications   enable row level security;
alter table expenses        enable row level security;
alter table employees       enable row level security;
alter table vendors         enable row level security;
alter table purchases       enable row level security;
alter table vendor_payments enable row level security;
alter table messages        enable row level security;

-- customers
create policy office_all on customers for all using (is_office()) with check (is_office());
create policy avo_read   on customers for select using (avo_id = auth.uid());

create policy office_all on guarantors for all using (is_office()) with check (is_office());
create policy avo_read   on guarantors for select
  using (exists (select 1 from customers c where c.id = customer_id and c.avo_id = auth.uid()));

create policy office_all on agreements for all using (is_office()) with check (is_office());
create policy avo_read   on agreements for select
  using (exists (select 1 from customers c where c.id = customer_id and c.avo_id = auth.uid()));

create policy office_all on agreement_items for all using (is_office()) with check (is_office());

create policy office_all on installments for all using (is_office()) with check (is_office());
create policy avo_read   on installments for select
  using (exists (select 1 from agreements a join customers c on c.id = a.customer_id
                 where a.id = agreement_id and c.avo_id = auth.uid()));

-- receipts: AVO may insert for own customers, read own collections
create policy office_all on receipts for all using (is_office()) with check (is_office());
create policy avo_read   on receipts for select using (collected_by = auth.uid());
create policy avo_insert on receipts for insert
  with check (exists (select 1 from customers c where c.id = customer_id and c.avo_id = auth.uid()));

create policy office_all on verifications for all using (is_office()) with check (is_office());
create policy avo_own    on verifications for all using (avo_id = auth.uid()) with check (avo_id = auth.uid());

-- money & staff: owner / accountant / manager only
create policy finance on expenses        for all using (my_role() in ('owner','accountant','manager'));
create policy finance on vendor_payments for all using (my_role() in ('owner','accountant','manager'));
create policy finance on purchases       for all using (my_role() in ('owner','accountant','manager'));
create policy office  on vendors         for all using (is_office());
create policy hr      on employees       for all using (my_role() in ('owner','manager'));
create policy office  on messages        for all using (is_office());
