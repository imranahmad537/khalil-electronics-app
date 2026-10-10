import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { DataTable, type DataRow, type DataColumn } from "@/components/data-table";
import { LedgerSearch } from "@/components/ledger-search";
import { StatTile } from "@/components/stat-tile";
import { money } from "@/lib/money";
import { SHOP_NAME } from "@/lib/constants";
import { SHOP_TZ } from "@/lib/shop-time";
import { REPORTS } from "@/lib/reports-config";
import {
  getInstallmentsReceivedReport,
  getInstallmentsReceivableReport,
  getDailyRecoverySheet,
  getDefaulterList,
  getCustomerLedgerIndex,
  getProfitLossReport,
} from "@/lib/data/reports";
import { getVendorsData } from "@/lib/data/vendors";
import { getProductsData } from "@/lib/data/products";
import { getCurrentPermissions } from "@/lib/current-user";
import { AccessDenied } from "@/components/access-denied";
import { Wallet, TrendingUp, Receipt, CheckCircle } from "lucide-react";

const ACCOUNT_LABEL: Record<string, string> = {
  cash_in_hand: "Cash in hand",
  meezan_bank: "Meezan Bank",
  jazzcash: "JazzCash",
};

function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ReportDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const def = REPORTS.find((r) => r.key === key);
  if (!def) notFound();

  const permissions = await getCurrentPermissions();
  if (def.requires && !permissions[def.requires]) {
    return <AccessDenied title={def.name} note="This report is visible to owners, managers and accountants only." />;
  }

  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: SHOP_TZ });

  const printedAt = new Date().toLocaleString("en-US", {
    timeZone: SHOP_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const header = (hint: string) => (
    <>
    <div className="print-only text-[11px] text-ink3 border-b border-line pb-2">
      {SHOP_NAME} · printed {printedAt}
    </div>
    <div className="flex items-center gap-3">
      <Link
        href="/reports"
        className="iconbtn border-0 cursor-pointer w-9 h-9 rounded-full bg-panel shadow-[var(--sh)] text-ink2 flex items-center justify-center no-print"
      >
        <ArrowLeft size={18} strokeWidth={2.4} />
      </Link>
      <PageHeader title={def.name} hint={hint}>
        <PrintButton />
      </PageHeader>
    </div>
    </>
  );

  if (key === "installments-received") {
    const data = await getInstallmentsReceivedReport();
    const columns: DataColumn[] = [
      { label: "When", align: "left" },
      { label: "Customer", align: "left" },
      { label: "Officer", align: "left" },
      { label: "Account", align: "left" },
      { label: "Amount", align: "right" },
    ];
    const rows: DataRow[] = data.rows.map((r) => ({
      key: r.id,
      cells: [
        { kind: "text", text: fmtDateTime(r.collectedAt), weight: 600 },
        { kind: "text", text: r.customerName, sub: "Acc " + r.accNo, weight: 700 },
        { kind: "text", text: r.officerName, weight: 500 },
        { kind: "text", text: ACCOUNT_LABEL[r.account] ?? r.account, weight: 500 },
        { kind: "text", text: money(r.amount), weight: 800, align: "right", fg: "var(--g700)" },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.rows.length} receipts · ${monthLabel}`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="130px minmax(160px,1.6fr) minmax(120px,1fr) 120px 120px" columns={columns} rows={rows} minWidth={760} emptyMessage="No receipts this month." />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.total)} total</div>
        </div>
      </div>
    );
  }

  if (key === "installments-receivable") {
    const data = await getInstallmentsReceivableReport();
    const columns: DataColumn[] = [
      { label: "Customer", align: "left" },
      { label: "Agreement", align: "left" },
      { label: "Guarantors", align: "left" },
      { label: "Due", align: "right" },
    ];
    const rows: DataRow[] = data.rows.map((r) => ({
      key: r.agreementId,
      cells: [
        { kind: "text", text: r.customerName, sub: "Acc " + r.accNo, weight: 700 },
        { kind: "text", text: `#${r.agreementNo}`, weight: 600 },
        { kind: "text", text: `${r.g1} / ${r.g2}`, weight: 500 },
        { kind: "text", text: money(r.dueAmount), weight: 800, align: "right", fg: r.monthsBehind > 0 ? "var(--red)" : undefined },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.rows.length} agreements with a balance`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="minmax(170px,1.6fr) 100px minmax(160px,1.4fr) 130px" columns={columns} rows={rows} minWidth={760} emptyMessage="Nothing receivable." />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.total)} total</div>
        </div>
      </div>
    );
  }

  if (key === "daily-recovery-sheet") {
    const data = await getDailyRecoverySheet();
    const columns: DataColumn[] = [
      { label: "Officer", align: "left" },
      { label: "Customer", align: "left" },
      { label: "Cell", align: "left" },
      { label: "Area", align: "left" },
      { label: "Due", align: "right" },
    ];
    const rows: DataRow[] = data.rows.map((r) => ({
      key: r.accNo,
      cells: [
        { kind: "text", text: r.officerName, weight: 700 },
        { kind: "text", text: r.customerName, sub: "Acc " + r.accNo, weight: 600 },
        { kind: "text", text: r.cell, weight: 500 },
        { kind: "text", text: r.area ?? "—", weight: 500 },
        { kind: "text", text: money(r.dueNow), weight: 800, align: "right" },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.rows.length} accounts due · for today's field round`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="minmax(130px,1fr) minmax(160px,1.5fr) 130px minmax(120px,1fr) 120px" columns={columns} rows={rows} minWidth={760} emptyMessage="Nothing due." />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.total)} total</div>
        </div>
      </div>
    );
  }

  if (key === "defaulter-list") {
    const data = await getDefaulterList();
    const columns: DataColumn[] = [
      { label: "Customer", align: "left" },
      { label: "Months behind", align: "left" },
      { label: "Guarantor 1", align: "left" },
      { label: "Guarantor 2", align: "left" },
      { label: "Due", align: "right" },
    ];
    const rows: DataRow[] = data.rows.map((r) => ({
      key: r.customerId,
      cells: [
        { kind: "text", text: r.customerName, sub: "Acc " + r.accNo + " · " + r.cell, weight: 700 },
        { kind: "text", text: String(r.monthsBehind), weight: 700, fg: "var(--red)" },
        { kind: "text", text: r.g1Name ? `${r.g1Name} · ${r.g1Cell ?? "—"}` : "—", weight: 500 },
        { kind: "text", text: r.g2Name ? `${r.g2Name} · ${r.g2Cell ?? "—"}` : "—", weight: 500 },
        { kind: "text", text: money(r.dueNow), weight: 800, align: "right", fg: "var(--red)" },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.rows.length} defaulters · flag guarantors for contact`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="minmax(170px,1.5fr) 120px minmax(150px,1.2fr) minmax(150px,1.2fr) 120px" columns={columns} rows={rows} minWidth={820} emptyMessage="No defaulters right now." />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.total)} at risk</div>
        </div>
      </div>
    );
  }

  if (key === "customer-ledger") {
    const customers = await getCustomerLedgerIndex();
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${customers.length} accounts — pick one to open its ledger`)}
        <div className="no-print">
          <LedgerSearch customers={customers} />
        </div>
      </div>
    );
  }

  if (key === "account-payables") {
    const data = await getVendorsData();
    const columns: DataColumn[] = [
      { label: "Vendor", align: "left" },
      { label: "Bills", align: "left" },
      { label: "Last bill", align: "left" },
      { label: "Payable", align: "right" },
    ];
    const rows: DataRow[] = data.rows.map((v) => ({
      key: v.id,
      cells: [
        { kind: "text", text: v.name, sub: v.cell ?? "", weight: 700 },
        { kind: "text", text: String(v.billCount), weight: 600 },
        {
          kind: "text",
          text: v.lastBillDate ? new Date(v.lastBillDate).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—",
          weight: 500,
        },
        { kind: "text", text: v.payable > 0 ? money(v.payable) : "Clear", weight: 800, align: "right", fg: v.payable > 0 ? "var(--red)" : "var(--g700)" },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.rows.length} vendors`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="minmax(180px,1.6fr) 100px minmax(130px,1fr) 130px" columns={columns} rows={rows} minWidth={700} />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.totalPayable)} total payable</div>
        </div>
      </div>
    );
  }

  if (key === "inventory-reorder") {
    const data = await getProductsData();
    const sorted = [...data.rows].sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock));
    const columns: DataColumn[] = [
      { label: "Product", align: "left" },
      { label: "Vendor", align: "left" },
      { label: "Cost", align: "right" },
      { label: "Stock", align: "right" },
      { label: "Min", align: "right" },
    ];
    const rows: DataRow[] = sorted.map((p) => ({
      key: p.id,
      cells: [
        { kind: "text", text: p.name, sub: p.categoryName ?? "", weight: 700 },
        { kind: "text", text: p.vendorName ?? "—", weight: 500 },
        { kind: "text", text: money(p.cost), weight: 600, align: "right" },
        { kind: "text", text: String(p.stock), weight: 800, align: "right", fg: p.stock <= p.minStock ? "var(--red)" : undefined },
        { kind: "text", text: String(p.minStock), weight: 500, align: "right" },
      ],
    }));
    return (
      <div className="print-report flex flex-col gap-4">
        {header(`${data.belowMinCount} of ${data.rows.length} below minimum`)}
        <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
          <DataTable gridTemplate="minmax(180px,1.7fr) minmax(140px,1.2fr) 100px 90px 80px" columns={columns} rows={rows} minWidth={760} />
          <div className="px-1 py-3 text-xs text-ink2 font-bold">{money(data.stockValue)} stock value at cost</div>
        </div>
      </div>
    );
  }

  if (key === "profit-loss") {
    const data = await getProfitLossReport();
    return (
      <div className="print-report flex flex-col gap-4">
        {header(monthLabel)}
        <div className="kpis">
          <StatTile label="Sales" value={money(data.salesThisMonth)} note="Agreements opened this month" tone="hero" icon={TrendingUp} />
          <StatTile label="Recovery" value={money(data.recoveryThisMonth)} note="Installments collected" tone="good" icon={CheckCircle} />
          <StatTile label="Expenses" value={money(data.expensesThisMonth)} note="Vouchers this month" tone="warn" icon={Receipt} />
          <StatTile label="Net cash position" value={money(data.netCashPosition)} note="All collections − expenses" tone={data.netCashPosition >= 0 ? "good" : "warn"} icon={Wallet} />
        </div>
        <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
          <h2 className="text-[16.5px] font-extrabold m-0">Gross margin</h2>
          <Line label="Sales (agreements opened this month)" value={money(data.salesThisMonth)} />
          <Line label="Cost of goods sold" value={"− " + money(data.cogs)} />
          <div className="border-t border-line pt-2">
            <Line label="Gross margin" value={money(data.grossMargin)} bold />
          </div>
        </div>
      </div>
    );
  }

  notFound();
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13.5px]">
      <span className={bold ? "font-extrabold" : "text-ink2"}>{label}</span>
      <span className={`num ${bold ? "font-extrabold text-[15px]" : "font-semibold"}`}>{value}</span>
    </div>
  );
}
