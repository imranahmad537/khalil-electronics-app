import { createClient } from "@/lib/supabase/server";
import { getMonthlyAttendance, type StaffMember } from "@/lib/data/attendance";
import { computePay, DEFAULT_PAY_RULES, type PayFigures, type PayRules } from "@/lib/payroll";
import type { MonthSummary } from "@/lib/attendance";

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: number;
  perDay: number;
  absentDays: number;
  halfDays: number;
  lateCount: number;
  lateDays: number;
  unpaidLeave: number;
  notJoinedDays: number;
  deductionDays: number;
  deduction: number;
  adjustment: number;
  adjustmentNote: string | null;
  netPay: number;
  account: string;
  paidOn: string;
}

export interface PayrollRow {
  employee: StaffMember;
  salary: number;
  summary: MonthSummary;
  /** worked out from the attendance register right now */
  figures: PayFigures;
  /** set once paid — the stored, locked figures */
  payslip: Payslip | null;
}

export async function getPayRules(): Promise<PayRules> {
  const supabase = await createClient();
  const { data } = await supabase.from("attendance_settings").select("pay_basis, lates_per_day, paid_leave").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_PAY_RULES;
  return { payBasis: data.pay_basis, latesPerDay: data.lates_per_day, paidLeave: data.paid_leave };
}

function toPayslip(p: {
  id: string;
  employee_id: string;
  month: string;
  base_salary: number;
  per_day: number;
  absent_days: number;
  half_days: number;
  late_count: number;
  late_days: number;
  unpaid_leave: number;
  not_joined_days: number;
  deduction_days: number;
  deduction: number;
  adjustment: number;
  adjustment_note: string | null;
  net_pay: number;
  account: string;
  paid_on: string;
}): Payslip {
  return {
    id: p.id,
    employeeId: p.employee_id,
    month: p.month,
    baseSalary: Number(p.base_salary),
    perDay: Number(p.per_day),
    absentDays: Number(p.absent_days),
    halfDays: Number(p.half_days),
    lateCount: Number(p.late_count),
    lateDays: Number(p.late_days),
    unpaidLeave: Number(p.unpaid_leave),
    notJoinedDays: Number(p.not_joined_days),
    deductionDays: Number(p.deduction_days),
    deduction: Number(p.deduction),
    adjustment: Number(p.adjustment),
    adjustmentNote: p.adjustment_note,
    netPay: Number(p.net_pay),
    account: p.account,
    paidOn: p.paid_on,
  };
}

export async function getPayroll(monthKey: string) {
  const supabase = await createClient();
  const [attendance, rules, salariesRes, slipsRes] = await Promise.all([
    getMonthlyAttendance(monthKey),
    getPayRules(),
    supabase.from("employees").select("id, salary").eq("active", true),
    supabase.from("payslips").select("*").eq("month", `${monthKey}-01`),
  ]);
  if (salariesRes.error) throw new Error(salariesRes.error.message);
  if (slipsRes.error) throw new Error(slipsRes.error.message);

  const salaryById = new Map((salariesRes.data ?? []).map((e) => [e.id, Number(e.salary)]));
  const slipById = new Map((slipsRes.data ?? []).map((p) => [p.employee_id, toPayslip(p)]));

  const rows: PayrollRow[] = attendance.rows.map((r) => {
    const salary = salaryById.get(r.employee.id) ?? 0;
    return {
      employee: r.employee,
      salary,
      summary: r.summary,
      figures: computePay(salary, r.days, rules, attendance.settings.weeklyOff),
      payslip: slipById.get(r.employee.id) ?? null,
    };
  });

  // month is still running if its last day is today or later
  const monthOver = attendance.days[attendance.days.length - 1] < attendance.today;
  return { monthKey, rules, weeklyOff: attendance.settings.weeklyOff, rows, monthOver };
}

export async function getPayslip(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payslips").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  const { data: emp } = await supabase.from("employees").select("full_name, role, cnic").eq("id", data.employee_id).maybeSingle();
  return { slip: toPayslip(data), employee: emp };
}
