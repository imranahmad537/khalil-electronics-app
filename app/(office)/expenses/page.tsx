import { Wallet, Home, UserCheck, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AddExpenseDialog, EditExpenseButton } from "@/components/expense-dialog";
import { money } from "@/lib/money";
import { getExpensesData } from "@/lib/data/expenses";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";

const GRID = "112px minmax(240px,1.9fr) minmax(140px,1.1fr) minmax(112px,1fr) 100px";
const COLUMNS = [
  { label: "Category", align: "left" as const },
  { label: "Description", align: "left" as const },
  { label: "Paid from", align: "left" as const },
  { label: "Amount", align: "right" as const },
  { label: "Action", align: "right" as const },
];

const ACCOUNT_LABEL: Record<string, string> = {
  cash_in_hand: "Cash in hand",
  meezan_bank: "Meezan Bank",
  jazzcash: "JazzCash",
};

export default async function ExpensesPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageFinance) {
    return <AccessDenied title="Expenses" note="Expense vouchers are visible to owners, managers and accountants only." />;
  }

  const data = await getExpensesData();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows: DataRow[] = data.rows.map((e) => ({
    key: e.id,
    cells: [
      { kind: "chip", label: e.category, bg: "var(--soft)", fg: "var(--ink2)" },
      {
        kind: "text",
        text: e.description ?? "—",
        sub: new Date(e.spentOn).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        weight: 600,
      },
      { kind: "text", text: ACCOUNT_LABEL[e.account] ?? e.account, weight: 500 },
      { kind: "text", text: money(e.amount), weight: 800, align: "right" },
      { kind: "node", align: "right", node: <EditExpenseButton expense={e} /> },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Expenses" hint={`${data.rows.length} vouchers · ${monthLabel}`}>
        <AddExpenseDialog />
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Spent this month"
          value={money(data.spentThisMonth)}
          note={`${data.rows.length} vouchers`}
          tone="hero"
          icon={Wallet}
        />
        <StatTile label="Fixed costs" value={money(data.fixedCosts)} note="Rent and utilities" tone="plain" icon={Home} />
        <StatTile
          label="Field & salaries"
          value={money(data.fieldAndSalaries)}
          note={`${monthLabel} to date`}
          tone="plain"
          icon={UserCheck}
        />
        <StatTile
          label="Recovery minus spend"
          value={money(data.cashPositionToday)}
          note="Today's cash position"
          tone={data.cashPositionToday >= 0 ? "good" : "warn"}
          icon={TrendingUp}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Voucher register</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={820} emptyMessage="No vouchers this month yet." />
        <div className="px-1 py-3 text-xs text-ink2">{money(data.spentThisMonth)} total</div>
      </div>
    </div>
  );
}
