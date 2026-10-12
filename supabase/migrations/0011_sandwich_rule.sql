-- Sandwich rule: a weekly off day or holiday that falls between two absences
-- (the working day before and the working day after are both absent) is
-- deducted as absent too. Worked out by the app (lib/payroll.ts); stored on
-- the payslip like the other deduction figures.

alter table attendance_settings add column if not exists sandwich_rule boolean not null default true;
alter table payslips add column if not exists sandwich_days numeric(5,1) not null default 0;

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
                        unpaid_leave, not_joined_days, sandwich_days, deduction_days, deduction, adjustment, adjustment_note,
                        net_pay, account, paid_on, expense_id, paid_by)
  values (p_employee, p_month, v_emp.salary, (p_figures->>'per_day')::numeric,
          (p_figures->>'absent_days')::numeric, (p_figures->>'half_days')::numeric,
          (p_figures->>'late_count')::numeric, (p_figures->>'late_days')::numeric,
          (p_figures->>'unpaid_leave')::numeric, (p_figures->>'not_joined_days')::numeric,
          coalesce((p_figures->>'sandwich_days')::numeric, 0),
          (p_figures->>'deduction_days')::numeric, (p_figures->>'deduction')::numeric,
          coalesce(p_adjustment, 0), nullif(trim(p_note), ''),
          v_net, p_account, v_paid_on, v_expense, auth.uid())
  returning id into v_slip;
  return v_slip;
end $$;
