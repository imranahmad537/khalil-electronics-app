import Link from "next/link";
import { Truck, Users, Receipt, CheckCircle, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { VendorRowAction } from "@/components/vendor-row-action";
import { money } from "@/lib/money";
import { getVendorsData } from "@/lib/data/vendors";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";

const GRID = "minmax(200px,1.7fr) minmax(140px,1.1fr) 96px 130px minmax(112px,1fr) 100px";
const COLUMNS = [
  { label: "Vendor", align: "left" as const },
  { label: "Contact", align: "left" as const },
  { label: "Bills", align: "left" as const },
  { label: "Last bill", align: "left" as const },
  { label: "Payable", align: "right" as const },
  { label: "Action", align: "right" as const },
];

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default async function VendorsPage() {
  const permissions = await getCurrentPermissions();
  if (!permissions.canManageFinance) {
    return <AccessDenied title="Vendors & bills" note="Vendor balances and bill history are visible to owners, managers and accountants only." />;
  }

  const data = await getVendorsData();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows: DataRow[] = data.rows.map((v) => ({
    key: v.id,
    cells: [
      { kind: "text", text: v.name, weight: 700 },
      { kind: "text", text: v.cell ?? "—", weight: 500 },
      { kind: "text", text: String(v.billCount), weight: 600 },
      { kind: "text", text: fmtDate(v.lastBillDate), weight: 500 },
      {
        kind: "text",
        text: v.payable > 0 ? money(v.payable) : "Clear",
        weight: 800,
        align: "right",
        fg: v.payable > 0 ? "var(--red)" : "var(--g700)",
      },
      {
        kind: "node",
        align: "right",
        node: <VendorRowAction vendorId={v.id} vendorName={v.name} payable={v.payable} />,
      },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Vendors & bills" hint={`${data.rows.length} suppliers`}>
        <Link
          href="/vendors/purchases/new"
          className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
          style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
        >
          <Plus size={16} strokeWidth={2.4} />
          New purchase bill
        </Link>
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Total payable"
          value={money(data.totalPayable)}
          note={`${data.vendorsWithBalance} vendors with balance`}
          tone="hero"
          icon={Truck}
        />
        <StatTile label="Vendors" value={String(data.rows.length)} note="Active suppliers" tone="plain" icon={Users} />
        <StatTile
          label="Bills this month"
          value={String(data.billsThisMonth)}
          note={monthLabel}
          tone="plain"
          icon={Receipt}
        />
        <StatTile
          label="Paid this month"
          value={money(data.paidThisMonth)}
          note="Across all accounts"
          tone="good"
          icon={CheckCircle}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <div className="flex items-center gap-3">
          <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Account payables</h2>
          <Link href="/vendors/payments" className="text-[12.5px] font-bold text-g700">
            Payment history →
          </Link>
        </div>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={900} />
        <div className="px-1 py-3 text-xs text-ink2">{data.billsThisMonth} bills this month</div>
      </div>
    </div>
  );
}
