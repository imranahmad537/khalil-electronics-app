import Link from "next/link";
import { Calendar, CheckCircle, AlertCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { StatTile } from "@/components/stat-tile";
import { AvoFilter } from "@/components/avo-filter";
import { DataTable, type DataRow } from "@/components/data-table";
import { RowActions } from "@/components/row-actions";
import { STATUS_META } from "@/lib/status";
import { money } from "@/lib/money";
import { getCustomersData, type CustomerListRow } from "@/lib/data/customers";
import { ATTENTION_STATUSES } from "@/lib/constants";
import type { CustomerStatus } from "@/lib/types";

const GRID = "minmax(190px,1.8fr) minmax(160px,1.4fr) 86px minmax(105px,1fr) minmax(112px,1fr) 112px 100px";

type Tab = "all" | "attention" | "due" | "short" | "overdue" | "default" | "paid";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "attention", label: "Needs attention" },
  { key: "due", label: "Due" },
  { key: "short", label: "Short paid" },
  { key: "overdue", label: "Overdue" },
  { key: "default", label: "Defaulter" },
  { key: "paid", label: "Paid" },
];

function matchesTab(row: CustomerListRow, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "attention") return ATTENTION_STATUSES.includes(row.status as (typeof ATTENTION_STATUSES)[number]);
  return row.status === (tab as CustomerStatus);
}

function countFor(rows: CustomerListRow[], tab: Tab) {
  return rows.filter((r) => matchesTab(r, tab)).length;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; avo?: string; q?: string }>;
}) {
  const { tab: tabParam, avo: avoParam, q: qParam } = await searchParams;
  const q = (qParam ?? "").trim().toLowerCase();
  const tab: Tab = (TABS.map((t) => t.key) as string[]).includes(tabParam ?? "") ? (tabParam as Tab) : "all";
  const avoFilter = avoParam ?? "all";

  const data = await getCustomersData();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const officers = Array.from(new Set(data.rows.map((r) => r.avoName))).filter((n) => n !== "Unassigned").sort();

  const bySearch = q
    ? data.rows.filter((r) =>
        [r.fullName, r.accNo, r.cell, r.area ?? "", r.g1Name ?? "", r.g2Name ?? "", r.g1Cell ?? "", r.g2Cell ?? ""].join(" ").toLowerCase().includes(q)
      )
    : data.rows;
  const byAvo = avoFilter === "all" ? bySearch : bySearch.filter((r) => r.avoName === avoFilter);
  const visibleRows = byAvo.filter((r) => matchesTab(r, tab));
  const shownDue = visibleRows.reduce((t, r) => t + r.dueNow, 0);

  const tableRows: DataRow[] = visibleRows.map((r) => {
    const meta = STATUS_META[r.status];
    const agreementCount = r.agreements.length;
    const planCell =
      agreementCount === 0
        ? { text: "No plan", sub: "—" }
        : agreementCount === 1
          ? {
              text: `${r.agreements[0].planMonths ?? "—"} mo`,
              sub: `${r.agreements[0].paidCount}/${r.agreements[0].totalCount} paid`,
            }
          : { text: `${agreementCount} agreements`, sub: "see ledger" };
    const monthlyTotal = r.agreements.reduce((t, a) => t + a.monthly, 0);
    const priceTotal = r.agreements.reduce((t, a) => t + a.totalPrice, 0);

    return {
      key: r.customerId,
      cells: [
        { kind: "text", text: r.fullName, sub: `Acc ${r.accNo} · ${r.cell}`, weight: 700 },
        {
          kind: "text",
          text: `${r.g1Name ?? "—"} / ${r.g2Name ?? "—"}`,
          sub: `${r.g1Cell ?? "—"} · ${r.g2Cell ?? "—"}`,
          weight: 500,
        },
        { kind: "text", text: planCell.text, sub: planCell.sub, weight: 700 },
        {
          kind: "text",
          text: agreementCount > 0 ? money(monthlyTotal) : "—",
          sub: agreementCount > 0 ? "price " + money(priceTotal) : "",
          weight: 600,
          align: "right",
        },
        {
          kind: "text",
          text: r.dueNow > 0 ? money(r.dueNow) : "—",
          sub: r.carry > 0 ? "incl " + money(r.carry) + " carry" : "",
          weight: 800,
          align: "right",
          fg: r.dueNow > 0 && (r.status === "overdue" || r.status === "default") ? "var(--red)" : undefined,
        },
        { kind: "chip", label: meta.label, bg: meta.chipBg, fg: meta.chipFg },
        {
          kind: "node",
          align: "right",
          node: (
            <RowActions
              customerId={r.customerId}
              customerName={r.fullName}
              cell={r.cell}
              accNo={r.accNo}
              avoName={r.avoName}
              dueNow={r.dueNow}
              monthLabel={monthLabel}
              agreements={r.collectAgreements}
            />
          ),
        },
      ],
    };
  });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Customers" hint={q ? `${visibleRows.length} result${visibleRows.length === 1 ? "" : "s"} for “${qParam?.trim()}” · ${data.rows.length} accounts` : `${visibleRows.length} of ${data.rows.length} accounts`}>
        {q && (
          <Link href="/customers" className="rounded-full px-[14px] py-[9px] text-[12.5px] font-bold border border-line bg-white text-ink2">
            Clear search
          </Link>
        )}
        <MonthSwitcher />
        <Link
          href="/agreements/new"
          className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
          style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
        >
          New agreement
        </Link>
      </PageHeader>

      <div className="kpis">
        <StatTile
          label="Due this month"
          value={money(data.totalDue)}
          note={`${data.rows.filter((r) => r.dueNow > 0).length} accounts open`}
          tone="hero"
          icon={Calendar}
        />
        <StatTile
          label="Collected"
          value={money(data.collectedThisMonth)}
          note={`${monthLabel} so far`}
          tone="good"
          icon={CheckCircle}
        />
        <StatTile
          label="Outstanding"
          value={money(data.outstanding)}
          note="Across open agreements"
          tone="warn"
          icon={AlertCircle}
        />
        <StatTile
          label="Shown by filter"
          value={money(shownDue)}
          note={`${visibleRows.length} of ${data.rows.length} rows`}
          tone="plain"
          icon={Users}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <div className="flex items-center gap-[10px] flex-wrap">
          <h2 className="text-[16.5px] font-extrabold m-0">Register · {monthLabel}</h2>
          <div className="flex-1" />
          <AvoFilter officers={officers} />
        </div>

        <div className="flex gap-[6px] flex-wrap">
          {TABS.map((t) => {
            const active = t.key === tab;
            const qp = new URLSearchParams();
            if (t.key !== "all") qp.set("tab", t.key);
            if (avoFilter !== "all") qp.set("avo", avoFilter);
            const qs = qp.toString();
            return (
              <Link
                key={t.key}
                href={`/customers${qs ? "?" + qs : ""}`}
                className="cursor-pointer rounded-full px-[13px] py-[7px] text-xs font-bold whitespace-nowrap"
                style={{
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "#fff",
                  color: active ? "#fff" : "var(--ink2)",
                }}
              >
                {t.label} · {countFor(byAvo, t.key)}
              </Link>
            );
          })}
        </div>

        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={tableRows} minWidth={960} />

        <div className="px-1 py-3 text-xs text-ink2">
          Book value {money(data.bookValue)} · {data.newThisMonthCount} new this month
        </div>
      </div>
    </div>
  );
}

const COLUMNS = [
  { label: "Customer", align: "left" as const },
  { label: "Guarantors", align: "left" as const },
  { label: "Plan", align: "left" as const },
  { label: "Monthly", align: "right" as const },
  { label: "Due now", align: "right" as const },
  { label: "Status", align: "left" as const },
  { label: "Action", align: "right" as const },
];
