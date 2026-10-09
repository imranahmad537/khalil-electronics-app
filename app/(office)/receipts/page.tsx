import Link from "next/link";
import { CheckCircle, AlertCircle, Banknote, TrendingUp, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { NewReceiptButton } from "@/components/new-receipt-button";
import { money } from "@/lib/money";
import { getReceiptsData } from "@/lib/data/receipts";

const GRID = "86px minmax(180px,1.6fr) minmax(140px,1fr) 110px minmax(112px,1fr) 100px";
const COLUMNS = [
  { label: "Receipt", align: "left" as const },
  { label: "Customer", align: "left" as const },
  { label: "Officer", align: "left" as const },
  { label: "Mode", align: "left" as const },
  { label: "Amount", align: "right" as const },
  { label: "Slip", align: "right" as const },
];

const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};

export default async function ReceiptsPage() {
  const data = await getReceiptsData();

  const rows: DataRow[] = data.rows.map((r) => ({
    key: r.id,
    cells: [
      {
        kind: "text",
        text: "#" + r.receiptNo,
        sub: new Date(r.collectedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        weight: 700,
      },
      { kind: "text", text: r.customerName, sub: "Acc " + r.accNo, weight: 700 },
      { kind: "text", text: r.officerName, weight: 500 },
      { kind: "text", text: MODE_LABEL[r.mode] ?? r.mode, weight: 500 },
      { kind: "text", text: money(r.amount), weight: 800, align: "right", fg: "var(--g700)" },
      {
        kind: "node",
        align: "right",
        node: (
          <Link
            href={`/receipts/${r.id}/print`}
            target="_blank"
            className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2 inline-flex items-center gap-[6px]"
          >
            <Printer size={13} strokeWidth={2.4} />
            Print
          </Link>
        ),
      },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Receipts" hint={`${data.rows.length} posted today`}>
        <NewReceiptButton pendingCustomers={data.pendingCustomers} />
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Collected today"
          value={money(data.collectedToday)}
          note={`${data.rows.length} receipts`}
          tone="hero"
          icon={CheckCircle}
        />
        <StatTile
          label="Outstanding"
          value={money(data.outstanding)}
          note={`${data.pendingCustomers.length} customers pending`}
          tone="warn"
          icon={AlertCircle}
        />
        <StatTile label="Cash in hand" value={money(data.cashInHand)} note="From recorded transactions" tone="plain" icon={Banknote} />
        <StatTile
          label="Average receipt"
          value={money(data.collectedToday / Math.max(1, data.rows.length))}
          note="Across posted receipts"
          tone="plain"
          icon={TrendingUp}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Posted receipts</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={820} emptyMessage="No receipts posted today yet." />
        <div className="px-1 py-3 text-xs text-ink2">Posts to Cash in hand, Meezan Bank or JazzCash</div>
      </div>
    </div>
  );
}
