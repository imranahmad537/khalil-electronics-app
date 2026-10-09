import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DataTable, type DataRow } from "@/components/data-table";
import { money } from "@/lib/money";
import { getVendorPaymentsHistory } from "@/lib/data/vendors";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";

const GRID = "minmax(180px,1.4fr) minmax(130px,1fr) 120px minmax(160px,1.4fr) 110px";
const COLUMNS = [
  { label: "Vendor", align: "left" as const },
  { label: "Paid from", align: "left" as const },
  { label: "Date", align: "left" as const },
  { label: "Notes", align: "left" as const },
  { label: "Amount", align: "right" as const },
];

const ACCOUNT_LABEL: Record<string, string> = {
  cash_in_hand: "Cash in hand",
  meezan_bank: "Meezan Bank",
  jazzcash: "JazzCash",
};

export default async function VendorPaymentsPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageFinance) {
    return <AccessDenied title="Payment history" note="Vendor payment history is visible to owners, managers and accountants only." />;
  }

  const payments = await getVendorPaymentsHistory();
  const total = payments.reduce((t, p) => t + p.amount, 0);

  const rows: DataRow[] = payments.map((p) => ({
    key: p.id,
    cells: [
      { kind: "text", text: p.vendorName, weight: 700 },
      { kind: "text", text: ACCOUNT_LABEL[p.account] ?? p.account, weight: 500 },
      {
        kind: "text",
        text: new Date(p.paidOn).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
        weight: 500,
      },
      { kind: "text", text: p.notes ?? "—" },
      { kind: "text", text: money(p.amount), weight: 800, align: "right" },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/vendors"
          className="iconbtn border-0 cursor-pointer w-9 h-9 rounded-full bg-panel shadow-[var(--sh)] text-ink2 flex items-center justify-center"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </Link>
        <PageHeader title="Payment history" hint={`${payments.length} payments · ${money(total)} total`} />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={820} emptyMessage="No payments recorded yet." />
      </div>
    </div>
  );
}
