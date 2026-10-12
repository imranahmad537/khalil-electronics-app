import Link from "next/link";
import { ChevronLeft, ChevronRight, Wallet, MinusCircle, Banknote, CheckCircle, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { PrintButton } from "@/components/print-button";
import { AccessDenied } from "@/components/access-denied";
import { PaySalaryButton, PayRulesDialog, UndoSalaryButton } from "@/components/payroll-dialogs";
import { getCurrentPermissions } from "@/lib/current-user";
import { getPayroll } from "@/lib/data/payroll";
import { deductionBreakdown } from "@/lib/payroll";
import { ROLE_LABEL } from "@/lib/roles";
import { money } from "@/lib/money";
import { SHOP_NAME } from "@/lib/constants";
import { shopTodayStr } from "@/lib/shop-time";

const MONTH = /^\d{4}-\d{2}$/;
const GRID = "minmax(170px,1.4fr) minmax(100px,.8fr) minmax(150px,1.1fr) minmax(170px,1.4fr) minmax(100px,.8fr) minmax(110px,.8fr) minmax(170px,1.1fr)";
const COLUMNS = [
  { label: "Employee", align: "left" as const },
  { label: "Salary", align: "right" as const },
  { label: "Attendance", align: "left" as const },
  { label: "Deduction", align: "left" as const },
  { label: "Adjust.", align: "right" as const },
  { label: "Net pay", align: "right" as const },
  { label: "Status", align: "right" as const },
];

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}
function monthName(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}
function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", day: "numeric", month: "short" });
}

const navBtn = "w-9 h-9 rounded-full bg-panel shadow-[var(--sh)] text-ink2 flex items-center justify-center";

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageEmployees) {
    return <AccessDenied title="Payroll" note="Salaries and payroll are visible to the owner and manager only." />;
  }

  const sp = await searchParams;
  const month = sp.month && MONTH.test(sp.month) ? sp.month : shopTodayStr().slice(0, 7);
  const label = monthName(month);
  const data = await getPayroll(month);

  const rows: DataRow[] = data.rows.map((r) => {
    const slip = r.payslip;
    const deductionDays = slip ? slip.deductionDays : r.figures.deductionDays;
    const deduction = slip ? slip.deduction : r.figures.deduction;
    const salary = slip ? slip.baseSalary : r.salary;
    const net = slip ? slip.netPay : r.figures.netPay;
    const breakdown = slip
      ? deductionBreakdown({ ...r.figures, ...slip, netPay: slip.netPay })
      : deductionBreakdown(r.figures);
    return {
      key: r.employee.id,
      cells: [
        { kind: "text", text: r.employee.fullName, sub: ROLE_LABEL[r.employee.role], weight: 700 },
        { kind: "text", text: salary ? money(salary) : "Not set", weight: 700, align: "right", fg: salary ? undefined : "var(--red)" },
        {
          kind: "text",
          text: `P ${r.summary.present + r.summary.late} · A ${r.summary.absent} · H ${r.summary.halfDay}`,
          sub: `Late ${r.summary.late} · Leave ${r.summary.leave}`,
          weight: 600,
        },
        {
          kind: "text",
          text: deduction ? `− ${money(deduction)}` : "—",
          sub: deduction ? `${deductionDays} day${deductionDays === 1 ? "" : "s"}: ${breakdown}` : undefined,
          weight: 700,
          fg: deduction ? "var(--red)" : undefined,
        },
        {
          kind: "text",
          text: slip && slip.adjustment ? `${slip.adjustment > 0 ? "+" : "−"} ${money(Math.abs(slip.adjustment))}` : "—",
          sub: slip?.adjustmentNote ?? undefined,
          weight: 600,
          align: "right",
        },
        { kind: "text", text: money(net), weight: 800, align: "right", fg: "var(--g700)" },
        {
          kind: "node",
          align: "right",
          node: slip ? (
            <span className="flex items-center gap-[6px] justify-end">
              <span className="rounded-full px-[10px] py-[4px] text-[11.5px] font-bold bg-g50 text-g700 flex items-center gap-1">
                <CheckCircle size={12} strokeWidth={2.6} />
                Paid {shortDate(slip.paidOn)}
              </span>
              <Link
                href={`/payroll/slip/${slip.id}`}
                target="_blank"
                title="Print payslip"
                className="no-print w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center"
              >
                <Printer size={14} strokeWidth={2.4} />
              </Link>
              <span className="no-print">
                <UndoSalaryButton payslipId={slip.id} name={r.employee.fullName} />
              </span>
            </span>
          ) : (
            <span className="no-print">
              <PaySalaryButton
                employeeId={r.employee.id}
                name={r.employee.fullName}
                month={month}
                monthLabel={label}
                salary={r.salary}
                figures={r.figures}
                monthOver={data.monthOver}
              />
            </span>
          ),
        },
      ],
    };
  });

  const gross = data.rows.reduce((t, r) => t + (r.payslip?.baseSalary ?? r.salary), 0);
  const deductions = data.rows.reduce((t, r) => t + (r.payslip?.deduction ?? r.figures.deduction), 0);
  const net = data.rows.reduce((t, r) => t + (r.payslip?.netPay ?? r.figures.netPay), 0);
  const paid = data.rows.filter((r) => r.payslip);
  const paidTotal = paid.reduce((t, r) => t + (r.payslip?.netPay ?? 0), 0);

  const rulesNote = [
    data.rules.payBasis === "fixed_30" ? "1 day = salary ÷ 30" : "1 day = salary ÷ working days",
    data.rules.latesPerDay ? `${data.rules.latesPerDay} lates = 1 day` : "lates not deducted",
    data.rules.paidLeave ? "leave paid" : "leave unpaid",
    data.rules.sandwichRule ? "sandwich rule on" : "sandwich rule off",
  ].join(" · ");

  return (
    <div className="print-report flex flex-col gap-4">
      <div className="print-only text-[11px] text-ink3 border-b border-line pb-2">
        {SHOP_NAME} · Payroll · {label}
      </div>
      <PageHeader title="Payroll" hint={`${label} · ${rulesNote}`}>
        <PayRulesDialog rules={data.rules} />
        <PrintButton />
      </PageHeader>

      <div className="no-print flex items-center gap-2 flex-wrap">
        <Link href={`/payroll?month=${shiftMonth(month, -1)}`} className={navBtn} title="Previous month">
          <ChevronLeft size={18} strokeWidth={2.4} />
        </Link>
        <div className="text-[15px] font-extrabold px-1">{label}</div>
        <Link href={`/payroll?month=${shiftMonth(month, 1)}`} className={navBtn} title="Next month">
          <ChevronRight size={18} strokeWidth={2.4} />
        </Link>
        {!data.monthOver && (
          <span className="ml-2 rounded-full px-3 py-[6px] text-[11.5px] font-bold bg-amber50" style={{ color: "#8a5a10" }}>
            Month in progress — figures count attendance up to today
          </span>
        )}
        <Link href={`/attendance?view=monthly&month=${month}`} className="ml-auto text-[12.5px] font-bold text-g700">
          Open attendance sheet →
        </Link>
      </div>

      <div className="kpis">
        <StatTile label="Gross salaries" value={money(gross)} note={`${data.rows.length} staff`} tone="hero" icon={Wallet} />
        <StatTile label="Attendance deductions" value={money(deductions)} note="Absents, half days, lates" tone="warn" icon={MinusCircle} />
        <StatTile label="Net payable" value={money(net)} note="Before adjustments" tone="plain" icon={Banknote} />
        <StatTile label="Paid" value={money(paidTotal)} note={`${paid.length} of ${data.rows.length} staff`} tone="good" icon={CheckCircle} />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Salary sheet</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={1060} emptyMessage="No active staff. Add staff in Employees." />
        <p className="m-0 pb-3 text-[11.5px] text-ink3">
          Paying records the net amount as a Salaries expense from the chosen account. Paid rows keep the figures they were paid with, even if attendance is
          corrected later — undo and pay again to apply a correction.
        </p>
      </div>
    </div>
  );
}
