"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CheckCircle, AlertCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { StatTile } from "@/components/stat-tile";
import { AvoFilter } from "@/components/avo-filter";
import { DataTable, type DataColumn, type DataRow } from "@/components/data-table";
import { money } from "@/lib/money";
import { ATTENTION_STATUSES } from "@/lib/constants";
import type { CustomerStatus } from "@/lib/types";

export interface RegisterItem {
  row: DataRow;
  search: string;
  status: CustomerStatus;
  avoName: string;
  dueNow: number;
}

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

function matchesTab(item: RegisterItem, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "attention") return ATTENTION_STATUSES.includes(item.status as (typeof ATTENTION_STATUSES)[number]);
  return item.status === (tab as CustomerStatus);
}

// Filters (search, tab, officer) live in the URL but are applied here in the browser,
// so changing them updates instantly without refetching the register from the server.
function setParam(searchParams: URLSearchParams, key: string, value: string | null) {
  const params = new URLSearchParams(searchParams.toString());
  if (value) params.set(key, value);
  else params.delete(key);
  const qs = params.toString();
  window.history.pushState(null, "", `/customers${qs ? "?" + qs : ""}`);
}

export function CustomerRegister({
  items,
  officers,
  monthLabel,
  gridTemplate,
  columns,
  totalDue,
  collectedThisMonth,
  outstanding,
  bookValue,
  newThisMonthCount,
}: {
  items: RegisterItem[];
  officers: string[];
  monthLabel: string;
  gridTemplate: string;
  columns: DataColumn[];
  totalDue: number;
  collectedThisMonth: number;
  outstanding: number;
  bookValue: number;
  newThisMonthCount: number;
}) {
  const searchParams = useSearchParams();
  const qRaw = (searchParams.get("q") ?? "").trim();
  const q = qRaw.toLowerCase();
  const tabParam = searchParams.get("tab") ?? "";
  const tab: Tab = (TABS.map((t) => t.key) as string[]).includes(tabParam) ? (tabParam as Tab) : "all";
  const avoFilter = searchParams.get("avo") ?? "all";

  const bySearch = q ? items.filter((i) => i.search.includes(q)) : items;
  const byAvo = avoFilter === "all" ? bySearch : bySearch.filter((i) => i.avoName === avoFilter);
  const visible = byAvo.filter((i) => matchesTab(i, tab));
  const shownDue = visible.reduce((t, i) => t + i.dueNow, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Customers"
        hint={
          q
            ? `${visible.length} result${visible.length === 1 ? "" : "s"} for “${qRaw}” · ${items.length} accounts`
            : `${visible.length} of ${items.length} accounts`
        }
      >
        {q && (
          <button
            type="button"
            onClick={() => setParam(searchParams, "q", null)}
            className="cursor-pointer rounded-full px-[14px] py-[9px] text-[12.5px] font-bold border border-line bg-white text-ink2"
          >
            Clear search
          </button>
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
          value={money(totalDue)}
          note={`${items.filter((i) => i.dueNow > 0).length} accounts open`}
          tone="hero"
          icon={Calendar}
        />
        <StatTile label="Collected" value={money(collectedThisMonth)} note={`${monthLabel} so far`} tone="good" icon={CheckCircle} />
        <StatTile label="Outstanding" value={money(outstanding)} note="Across open agreements" tone="warn" icon={AlertCircle} />
        <StatTile
          label="Shown by filter"
          value={money(shownDue)}
          note={`${visible.length} of ${items.length} rows`}
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
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setParam(searchParams, "tab", t.key === "all" ? null : t.key)}
                className="cursor-pointer rounded-full px-[13px] py-[7px] text-xs font-bold whitespace-nowrap"
                style={{
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "#fff",
                  color: active ? "#fff" : "var(--ink2)",
                }}
              >
                {t.label} · {byAvo.filter((i) => matchesTab(i, t.key)).length}
              </button>
            );
          })}
        </div>

        <DataTable gridTemplate={gridTemplate} columns={columns} rows={visible.map((i) => i.row)} minWidth={960} />

        <div className="px-1 py-3 text-xs text-ink2">
          Book value {money(bookValue)} · {newThisMonthCount} new this month
        </div>
      </div>
    </div>
  );
}
