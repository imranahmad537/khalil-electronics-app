import { notFound } from "next/navigation";
import { getPayslip } from "@/lib/data/payroll";
import { getCurrentPermissions } from "@/lib/current-user";
import { deductionBreakdown } from "@/lib/payroll";
import { money } from "@/lib/money";
import { SHOP_NAME } from "@/lib/constants";
import { ROLE_LABEL } from "@/lib/roles";
import { MONEY_ACCOUNTS } from "@/lib/payment";
import { AutoPrint } from "@/components/auto-print";
import { PrintAgainButton } from "@/components/print-again-button";
import type { UserRole } from "@/lib/types";

function monthName(month: string) {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentPermissions()).canManageEmployees) notFound();
  const { id } = await params;
  const data = await getPayslip(id);
  if (!data) notFound();
  const { slip, employee } = data;

  const rows: [string, string, boolean?][] = [
    ["Monthly salary", money(slip.baseSalary)],
    [`Per day (${money(slip.perDay)}) × ${slip.deductionDays} day${slip.deductionDays === 1 ? "" : "s"}`, slip.deduction ? `− ${money(slip.deduction)}` : money(0)],
  ];
  if (slip.adjustment) rows.push([`Adjustment${slip.adjustmentNote ? ` — ${slip.adjustmentNote}` : ""}`, `${slip.adjustment > 0 ? "+ " : "− "}${money(Math.abs(slip.adjustment))}`]);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6 print:bg-white print:p-0">
      <AutoPrint />
      <div className="w-[440px] max-w-full bg-white rounded-2xl shadow-[var(--sh)] p-7 flex flex-col gap-5 print:shadow-none print:rounded-none">
        <div className="flex flex-col items-center gap-1 text-center border-b border-dashed border-line pb-4">
          <div className="text-[16px] font-extrabold">{SHOP_NAME}</div>
          <div className="text-[11.5px] text-ink3">Salary slip · {monthName(slip.month)}</div>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <Row label="Employee" value={employee?.full_name ?? "—"} />
          <Row label="Role" value={employee?.role ? ROLE_LABEL[employee.role as UserRole] : "—"} />
          {employee?.cnic && <Row label="CNIC" value={employee.cnic} />}
          <Row label="Paid on" value={new Date(`${slip.paidOn}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })} />
          <Row label="Paid from" value={MONEY_ACCOUNTS.find((a) => a.value === slip.account)?.label ?? slip.account} />
        </div>

        <div className="flex flex-col gap-2 p-4 rounded-xl bg-soft text-[12.5px]">
          <div className="text-[11px] font-bold uppercase tracking-[.06em] text-ink3">Attendance</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Absent: {slip.absentDays}</span>
            <span>Half days: {slip.halfDays}</span>
            <span>Lates: {slip.lateCount}</span>
            <span>Unpaid leave: {slip.unpaidLeave}</span>
            {slip.notJoinedDays > 0 && <span>Before joining: {slip.notJoinedDays}</span>}
          </div>
          <div className="text-[11.5px] text-ink3">
            Deducted days: {deductionBreakdown({ ...slip, netPay: slip.netPay })}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          {rows.map(([l, v]) => (
            <Row key={l} label={l} value={v} />
          ))}
        </div>

        <div className="rounded-xl bg-g900 text-white p-4 flex flex-col items-center gap-1">
          <span className="text-[11px] font-bold tracking-[.06em] uppercase" style={{ color: "rgba(255,255,255,.7)" }}>
            Net pay
          </span>
          <span className="num text-[26px] font-extrabold">{money(slip.netPay)}</span>
        </div>

        <div className="grid grid-cols-2 gap-6 pt-6 text-[11px] text-ink3 text-center">
          <div className="border-t border-line pt-1">Employee signature</div>
          <div className="border-t border-line pt-1">Authorised by</div>
        </div>
        <div className="print:hidden flex justify-center">
          <PrintAgainButton />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink3">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
}
