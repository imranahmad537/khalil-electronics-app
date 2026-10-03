import Link from "next/link";
import { StatusChip } from "@/components/status-chip";
import { RowActions } from "@/components/row-actions";
import { money } from "@/lib/money";
import { ATTENTION_STATUSES } from "@/lib/constants";
import { STATUS_META } from "@/lib/status";
import type { DashboardCustomerRow } from "@/lib/data/dashboard";

const GRID = "minmax(160px,2.2fr) 132px minmax(112px,1fr) 158px";

type Risk = "all" | "attention" | "due" | "paid";

function countFor(rows: DashboardCustomerRow[], key: Risk) {
  if (key === "all") return rows.length;
  if (key === "attention") return rows.filter((r) => ATTENTION_STATUSES.includes(r.status as (typeof ATTENTION_STATUSES)[number])).length;
  return rows.filter((r) => r.status === key).length;
}

export function DuesTable({
  allRows,
  visibleRows,
  risk,
  monthLabel,
}: {
  allRows: DashboardCustomerRow[];
  visibleRows: DashboardCustomerRow[];
  risk: Risk;
  monthLabel: string;
}) {
  const tabs: { key: Risk; label: string }[] = [
    { key: "all", label: "All" },
    { key: "attention", label: "Attention" },
    { key: "due", label: "Due" },
    { key: "paid", label: "Paid" },
  ];

  const bookValue = allRows.reduce((t, r) => t + Math.max(0, r.remaining ?? 0), 0);

  return (
    <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
      <div className="flex items-center gap-[10px] flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <h2 className="text-[16.5px] font-extrabold m-0">Dues to recover</h2>
          <span className="text-xs text-ink2">
            {monthLabel} · {visibleRows.length} of {allRows.length} accounts shown
          </span>
        </div>
        <div className="flex gap-[5px]">
          {tabs.map((t) => {
            const active = t.key === risk;
            return (
              <Link
                key={t.key}
                href={t.key === "all" ? "/dashboard" : `/dashboard?risk=${t.key}`}
                className="cursor-pointer rounded-full px-[13px] py-[7px] text-xs font-bold whitespace-nowrap"
                style={{
                  border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                  background: active ? "var(--ink)" : "#fff",
                  color: active ? "#fff" : "var(--ink2)",
                }}
              >
                {t.label} {countFor(allRows, t.key)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-[14px] flex-wrap px-[13px] py-[10px] rounded-[var(--r-md)] bg-soft">
        {[
          { label: "Paid", color: "var(--g500)" },
          { label: "Short paid", color: "var(--amber)" },
          { label: "Due 1–5", color: "#cbd2dc" },
          { label: "Overdue", color: "var(--overdue)" },
          { label: "Defaulter 2+", color: "var(--red)" },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-[7px] text-[11.5px] font-semibold text-ink2">
            <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <div
        className="grid gap-3 px-1 pb-2 border-b border-line text-[10.5px] font-bold tracking-[.08em] uppercase text-ink3"
        style={{ gridTemplateColumns: GRID }}
      >
        <span className="pl-[15px]">Customer</span>
        <span>Status</span>
        <span className="text-right">Due now</span>
        <span className="text-right pr-[41px]">Action</span>
      </div>

      <div className="flex flex-col">
        {visibleRows.map((r) => {
          const due = Math.max(0, r.due_now ?? 0);
          return (
            <div
              key={r.customer_id}
              className="trow grid gap-3 items-center px-1 py-[13px] border-b border-line"
              style={{ gridTemplateColumns: GRID }}
            >
              <div className="flex items-center gap-[11px] min-w-0">
                <span
                  className="w-1 h-[34px] rounded-full flex-none"
                  style={{ background: STATUS_META[r.status].edge }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                    {r.full_name}
                  </span>
                  <span className="text-[11.5px] text-ink2 overflow-hidden text-ellipsis whitespace-nowrap">
                    Acc {r.acc_no} · {r.area ?? "—"} · {r.avoName}
                  </span>
                </div>
              </div>
              <div>
                <StatusChip status={r.status} />
              </div>
              <div className="num flex flex-col gap-0.5 items-end">
                <span
                  className="text-[14.5px] font-extrabold"
                  style={{ color: due > 0 && (r.status === "overdue" || r.status === "default") ? "var(--red)" : "var(--ink)" }}
                >
                  {due > 0 ? money(due) : "Settled"}
                </span>
                <span className="text-[11px] text-ink3">{money(Math.max(0, r.remaining ?? 0))} left</span>
              </div>
              <RowActions
                customerId={r.customer_id}
                customerName={r.full_name}
                cell={r.cell}
                accNo={r.acc_no}
                avoName={r.avoName}
                dueNow={due}
                monthLabel={monthLabel}
                agreements={r.agreements}
              />
            </div>
          );
        })}
        {visibleRows.length === 0 && (
          <div className="p-7 text-center text-[13px] text-ink2">
            Nothing due in this filter — everyone here is settled.
          </div>
        )}
      </div>

      <div className="px-1 py-3 text-xs text-ink2">
        {money(bookValue)} on the books · {allRows.length} live agreements
      </div>
    </div>
  );
}
