-- Payroll with attendance deductions.
--
-- The monthly figures (absent / half / late / unpaid leave → deduction days)
-- are worked out from the attendance register by the app (lib/payroll.ts).
-- Paying a salary stores those figures on a payslip and books the money as a
-- "Salaries" expense in the same transaction, so cash and P&L stay right.
-- A paid payslip is the record: later attendance edits don't change it.

-- Deduction rules live next to the shift settings.
alter table attendance_settings add column if not exists pay_basis text not null default 'fixed_30'
  check (pay_basis in ('fixed_30', 'working_days'));      -- daily rate = salary ÷ 30, or ÷ working days in the month
alter table attendance_settings add column if not exists lates_per_day smallint not null default 3
  check (lates_per_day between 0 and 31);                  -- every N lates = 1 day's pay; 0 = lates aren't deducted
alter table attendance_settings add column if not exists paid_leave boolean not null default true;

create table if not exists payslips (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references employees on delete restrict,
  month            date not null check (extract(day from month) = 1),
  base_salary      numeric(12,2) not null,
  per_day          numeric(12,2) not null,
  absent_days      numeric(5,1) not null default 0,
  half_days        numeric(5,1) not null default 0,
  late_count       numeric(5,1) not null default 0,
  late_days        numeric(5,1) not null default 0,
  unpaid_leave     numeric(5,1) not null default 0,
  not_joined_days  numeric(5,1) not null default 0,
  deduction_days   numeric(5,1) not null default 0,
  deduction        numeric(12,2) not null default 0,
  adjustment       numeric(12,2) not null default 0,
  adjustment_note  text,
  net_pay          numeric(12,2) not null check (net_pay >= 0),
  account          money_account not null,
  paid_on          date not null default shop_today(),
  expense_id       uuid references expenses on delete set null,
  paid_by          uuid references profiles on delete set null,
  created_at       timestamptz not null default now(),
  unique (employee_id, month)
);

alter table payslips enable row level security;
-- salaries are HR data: the same people who see the employees table
create policy hr_read on payslips for select using (my_role() in ('owner','manager'));

create or replace function record_salary_payment(
  p_employee uuid, p_month date, p_figures jsonb, p_adjustment numeric, p_note text,
  p_account money_account, p_paid_on date default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_emp employees;
  v_net numeric;
  v_expense uuid;
  v_slip uuid;
  v_paid_on date := coalesce(p_paid_on, shop_today());
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can pay salaries.' using errcode = '42501';
  end if;
  if extract(day from p_month) <> 1 then raise exception 'Invalid payroll month.'; end if;
  select * into v_emp from employees where id = p_employee;
  if not found then raise exception 'Employee not found.'; end if;
  if exists (select 1 from payslips where employee_id = p_employee and month = p_month) then
    raise exception '% has already been paid for %.', v_emp.full_name, to_char(p_month, 'Mon YYYY');
  end if;

  v_net := round(v_emp.salary - (p_figures->>'deduction')::numeric + coalesce(p_adjustment, 0), 2);
  if v_net < 0 then raise exception 'Net pay can''t be negative — reduce the deduction or adjustment.'; end if;

  if v_net > 0 then
    insert into expenses (category, description, amount, account, spent_on, created_by)
    values ('Salaries', format('Salary — %s — %s', v_emp.full_name, to_char(p_month, 'Mon YYYY')), v_net, p_account, v_paid_on, auth.uid())
    returning id into v_expense;
  end if;

  insert into payslips (employee_id, month, base_salary, per_day, absent_days, half_days, late_count, late_days,
                        unpaid_leave, not_joined_days, deduction_days, deduction, adjustment, adjustment_note,
                        net_pay, account, paid_on, expense_id, paid_by)
  values (p_employee, p_month, v_emp.salary, (p_figures->>'per_day')::numeric,
          (p_figures->>'absent_days')::numeric, (p_figures->>'half_days')::numeric,
          (p_figures->>'late_count')::numeric, (p_figures->>'late_days')::numeric,
          (p_figures->>'unpaid_leave')::numeric, (p_figures->>'not_joined_days')::numeric,
          (p_figures->>'deduction_days')::numeric, (p_figures->>'deduction')::numeric,
          coalesce(p_adjustment, 0), nullif(trim(p_note), ''),
          v_net, p_account, v_paid_on, v_expense, auth.uid())
  returning id into v_slip;
  return v_slip;
end $$;

-- Undo a payment entered by mistake: removes the payslip and its expense.
create or replace function undo_salary_payment(p_payslip uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_expense uuid;
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can undo a salary payment.' using errcode = '42501';
  end if;
  delete from payslips where id = p_payslip returning expense_id into v_expense;
  if not found then raise exception 'Payslip not found.'; end if;
  if v_expense is not null then delete from expenses where id = v_expense; end if;
end $$;

revoke execute on function record_salary_payment(uuid, date, jsonb, numeric, text, money_account, date) from public, anon;
revoke execute on function undo_salary_payment(uuid) from public, anon;
grant execute on function record_salary_payment(uuid, date, jsonb, numeric, text, money_account, date) to authenticated, service_role;
grant execute on function undo_salary_payment(uuid) to authenticated, service_role;
