"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { getCurrentPermissions } from "@/lib/current-user";
import { getPayroll } from "@/lib/data/payroll";
import { isMoneyAccount, type MoneyAccount } from "@/lib/payment";
import { shopTodayStr } from "@/lib/shop-time";

type Result = { ok: true } | { ok: false; error: string };
const FORBIDDEN = { ok: false as const, error: "Only the owner or manager can run payroll." };
const MONTH = /^\d{4}-\d{2}$/;

function refresh() {
  revalidatePath("/payroll");
  revalidatePath("/expenses");
  revalidatePath("/employees");
}

/**
 * Pays one employee for a month. The deduction is recalculated here from the
 * attendance register — never taken from the browser — so the stored payslip
 * matches the register at the moment of payment.
 */
export async function paySalaryAction(input: {
  employeeId: string;
  month: string; // YYYY-MM
  adjustment: number;
  note: string;
  account: MoneyAccount;
}): Promise<{ ok: true; payslipId: string } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  if (!MONTH.test(input.month)) return { ok: false, error: "Invalid month." };
  if (input.month > shopTodayStr().slice(0, 7)) return { ok: false, error: "You can't pay a month that hasn't started yet." };
  if (!isMoneyAccount(input.account)) return { ok: false, error: "Choose the account the salary is paid from." };
  if (!Number.isFinite(input.adjustment)) return { ok: false, error: "Invalid adjustment." };
  if (input.adjustment !== 0 && !input.note.trim()) return { ok: false, error: "Add a note explaining the adjustment." };

  const payroll = await getPayroll(input.month);
  const row = payroll.rows.find((r) => r.employee.id === input.employeeId);
  if (!row) return { ok: false, error: "Employee not found for this month." };
  if (row.salary <= 0) return { ok: false, error: `${row.employee.fullName} has no salary set — add it in Employees first.` };

  const f = row.figures;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("record_salary_payment", {
    p_employee: input.employeeId,
    p_month: `${input.month}-01`,
    p_figures: {
      per_day: f.perDay,
      absent_days: f.absentDays,
      half_days: f.halfDays,
      late_count: f.lateCount,
      late_days: f.lateDays,
      unpaid_leave: f.unpaidLeave,
      not_joined_days: f.notJoinedDays,
      sandwich_days: f.sandwichDays,
      deduction_days: f.deductionDays,
      deduction: f.deduction,
    },
    p_adjustment: Math.round(input.adjustment),
    p_note: input.note,
    p_account: input.account,
  });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not record the payment.") };
  refresh();
  return { ok: true, payslipId: data as string };
}

export async function undoSalaryAction(payslipId: string): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_salary_payment", { p_payslip: payslipId });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not undo the payment.") };
  refresh();
  return { ok: true };
}

export async function updatePayRulesAction(input: {
  payBasis: "fixed_30" | "working_days";
  latesPerDay: number;
  paidLeave: boolean;
  sandwichRule: boolean;
}): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageEmployees) return FORBIDDEN;
  if (input.payBasis !== "fixed_30" && input.payBasis !== "working_days") return { ok: false, error: "Choose how the daily rate is worked out." };
  if (!(Number.isInteger(input.latesPerDay) && input.latesPerDay >= 0 && input.latesPerDay <= 31)) {
    return { ok: false, error: "Lates per day must be a whole number from 0 to 31." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance_settings")
    .update({ pay_basis: input.payBasis, lates_per_day: input.latesPerDay, paid_leave: input.paidLeave, sandwich_rule: !!input.sandwichRule })
    .eq("id", 1);
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save the rules.") };
  refresh();
  return { ok: true };
}
