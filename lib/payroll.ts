// Salary deductions from attendance. The same function feeds the payroll
// screen and the payment (app/actions/payroll.ts), so what the owner sees is
// exactly what gets paid and stored on the payslip.
import { weekdayOf, type DayState } from "@/lib/attendance";

export interface PayRules {
  /** daily rate = salary ÷ 30, or ÷ the month's working days */
  payBasis: "fixed_30" | "working_days";
  /** every N lates = 1 day's pay; 0 = lates aren't deducted */
  latesPerDay: number;
  paidLeave: boolean;
}

export const DEFAULT_PAY_RULES: PayRules = { payBasis: "fixed_30", latesPerDay: 3, paidLeave: true };

export interface PayFigures {
  perDay: number;
  absentDays: number;
  halfDays: number;
  lateCount: number;
  lateDays: number;
  unpaidLeave: number;
  notJoinedDays: number;
  deductionDays: number;
  deduction: number;
  /** salary − deduction, before any manual adjustment */
  netPay: number;
}

export function computePay(
  salary: number,
  days: { day: string; state: DayState }[],
  rules: PayRules,
  weeklyOff: number
): PayFigures {
  const count = (s: DayState) => days.filter((d) => d.state === s).length;
  const isOff = (d: { day: string }) => weekdayOf(d.day) === weeklyOff;

  const workingDaysInMonth = days.filter((d) => !isOff(d) && d.state !== "holiday" && d.state !== "off").length;
  const perDayRaw = rules.payBasis === "working_days" ? salary / Math.max(1, workingDaysInMonth) : salary / 30;

  const absentDays = count("absent");
  const halfDays = count("half_day");
  const lateCount = count("late");
  const lateDays = rules.latesPerDay > 0 ? Math.floor(lateCount / rules.latesPerDay) : 0;
  const unpaidLeave = rules.paidLeave ? 0 : count("leave");
  // not employed yet: on a 30-day basis every calendar day counts, otherwise only working days
  const notJoinedDays = days.filter((d) => d.state === "not_joined" && (rules.payBasis === "fixed_30" || !isOff(d))).length;

  const deductionDays = absentDays + halfDays / 2 + lateDays + unpaidLeave + notJoinedDays;
  // Absent for every working day of the month (nothing attended, no leave or
  // holiday): no salary — otherwise the ÷30 basis would still pay the off days.
  const attendedOrExcused = days.some((d) => ["present", "late", "half_day", "leave", "holiday"].includes(d.state));
  const fullMonthAbsent = !attendedOrExcused && absentDays > 0 && !days.some((d) => d.state === "upcoming" || d.state === "unmarked");
  const deduction = fullMonthAbsent ? salary : Math.min(salary, Math.round(perDayRaw * deductionDays));

  return {
    perDay: Math.round(perDayRaw * 100) / 100,
    absentDays,
    halfDays,
    lateCount,
    lateDays,
    unpaidLeave,
    notJoinedDays,
    deductionDays,
    deduction,
    netPay: salary - deduction,
  };
}

/** Plain-language breakdown, e.g. "2 absent + ½ × 1 half day + 1 (3 lates)". */
export function deductionBreakdown(f: PayFigures): string {
  const parts: string[] = [];
  if (f.absentDays) parts.push(`${f.absentDays} absent`);
  if (f.halfDays) parts.push(`½ × ${f.halfDays} half day${f.halfDays === 1 ? "" : "s"}`);
  if (f.lateDays) parts.push(`${f.lateDays} for ${f.lateCount} lates`);
  if (f.unpaidLeave) parts.push(`${f.unpaidLeave} unpaid leave`);
  if (f.notJoinedDays) parts.push(`${f.notJoinedDays} before joining`);
  return parts.length ? parts.join(" + ") : "No deductions";
}
