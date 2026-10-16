"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { CustomerListReportRow } from "@/lib/data/reports";
import { guarantorSearchText } from "@/lib/guarantors";

type Show = "all" | "balance" | "clear";
const SHOW: { key: Show; label: string }[] = [
  { key: "all", label: "All customers" },
  { key: "balance", label: "With balance" },
  { key: "clear", label: "No balance" },
];

interface CustomerGroup {
  customerId: string;
  accNo: string;
  fullName: string;
  cell: string;
  guarantors: CustomerListReportRow["guarantors"];
  noGuarantorReason: string | null;
  agreements: CustomerListReportRow[];
  remaining: number;
  search: string;
}

// Plain numbers in the cells (the header says Rs) keep columns narrow on paper.
const num = (v: number | null) => (v == null ? "—" : Math.round(v).toLocaleString("en-US"));
const rs = (v: number) => "Rs " + Math.round(v).toLocaleString("en-US");

function groupByCustomer(rows: CustomerListReportRow[]): CustomerGroup[] {
  const groups = new Map<string, CustomerGroup>();
  for (const r of rows) {
    let g = groups.get(r.customerId);
    if (!g) {
      g = {
        customerId: r.customerId,
        accNo: r.accNo,
        fullName: r.fullName,
        cell: r.cell,
        guarantors: r.guarantors,
        noGuarantorReason: r.noGuarantorReason,
        agreements: [],
        remaining: 0,
        search: [r.fullName, r.accNo, r.cell, guarantorSearchText(r.guarantors), r.noGuarantorReason ?? ""].join(" ").toLowerCase(),
      };
      groups.set(r.customerId, g);
    }
    g.agreements.push(r);
    g.remaining += r.remaining ?? 0;
    if (r.agreementNo) g.search += ` #${r.agreementNo}`;
  }
  return [...groups.values()];
}

// One block per customer: their details (and guarantors) once, then one line
// per live agreement. Printing prints exactly what's filtered.
export function CustomerListReport({ rows }: { rows: CustomerListReportRow[] }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<Show>("all");
  const groups = useMemo(() => groupByCustomer(rows), [rows]);

  const q = query.trim().toLowerCase();
  const visible = groups.filter(
    (g) =>
      (!q || g.search.includes(q)) &&
      (show === "all" || (show === "balance" ? g.remaining > 0 : g.remaining <= 0))
  );
  const agreementRows = visible.flatMap((g) => g.agreements).filter((a) => a.agreementNo != null);
  const totals = {
    price: agreementRows.reduce((t, a) => t + (a.totalPrice ?? 0), 0),
    advance: agreementRows.reduce((t, a) => t + (a.advance ?? 0), 0),
    monthly: agreementRows.reduce((t, a) => t + (a.monthly ?? 0), 0),
    remaining: agreementRows.reduce((t, a) => t + (a.remaining ?? 0), 0),
  };
  const filtered = !!q || show !== "all";

  return (
    <div className="cl-panel p-[16px_18px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="no-print flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] max-w-[420px] flex items-center gap-[9px] px-[14px] py-[9px] rounded-full bg-soft">
          <Search size={16} strokeWidth={2.4} className="text-ink3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, account, cell, guarantor…"
            className="flex-1 min-w-0 border-0 bg-transparent text-[13.5px] text-ink outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Clear search"
              className="border-0 bg-transparent cursor-pointer text-ink3 flex items-center"
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          )}
        </div>
        <div className="flex gap-[5px] p-1 bg-soft rounded-full">
          {SHOW.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setShow(s.key)}
              className="border-0 cursor-pointer rounded-full px-[13px] py-[6px] text-[12px] font-bold whitespace-nowrap"
              style={{ background: show === s.key ? "var(--ink)" : "transparent", color: show === s.key ? "#fff" : "var(--ink2)" }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cl-summary flex gap-x-5 gap-y-1 flex-wrap text-[12px] text-ink2">
        <span>
          <b className="text-ink">{visible.length}</b> customers{filtered && ` (of ${groups.length})`}
        </span>
        <span>
          <b className="text-ink">{agreementRows.length}</b> agreements
        </span>
        <span>
          Installment value <b className="text-ink">{rs(totals.price)}</b>
        </span>
        <span>
          Remaining <b className="text-red">{rs(totals.remaining)}</b>
        </span>
        {filtered && (
          <span className="print-only">
            Filter: {SHOW.find((s) => s.key === show)?.label}
            {q && ` · “${query.trim()}”`}
          </span>
        )}
      </div>

      <div className="cl-scroll overflow-x-auto">
        <table className="cl-table w-full min-w-[1040px] border-collapse text-[12.5px]">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Acc no</th>
              <th>Customer</th>
              <th>Cell</th>
              <th>Guarantor</th>
              <th>G. contact</th>
              <th>Agr.</th>
              <th>Plan</th>
              <th className="r">Inst. price</th>
              <th className="r">Advance</th>
              <th className="r">Monthly</th>
              <th className="r">Remaining</th>
            </tr>
          </thead>
          {visible.map((g, i) => {
            const span = g.agreements.length;
            return (
              <tbody key={g.customerId} className="cl-group">
                {g.agreements.map((a, j) => (
                  <tr key={a.key}>
                    {j === 0 && (
                      <>
                        <td rowSpan={span} className="muted">
                          {i + 1}
                        </td>
                        <td rowSpan={span} className="num strong">
                          {g.accNo}
                        </td>
                        <td rowSpan={span} className="strong">
                          {g.fullName}
                        </td>
                        <td rowSpan={span} className="num nowrap">
                          {g.cell}
                        </td>
                        <td rowSpan={span}>
                          <GuarantorNames group={g} />
                        </td>
                        <td rowSpan={span} className="num">
                          <GuarantorContacts group={g} />
                        </td>
                      </>
                    )}
                    {a.agreementNo == null ? (
                      <td colSpan={6} className="muted">
                        No active agreement
                      </td>
                    ) : (
                      <>
                        <td className="num">#{a.agreementNo}</td>
                        <td className="nowrap">
                          {a.planMonths ? `${a.planMonths} mo` : "Direct"}
                          {a.installmentCount > 0 && (
                            <span className="muted">
                              {" "}
                              · {a.paidCount}/{a.installmentCount}
                            </span>
                          )}
                        </td>
                        <td className="num r">{num(a.totalPrice)}</td>
                        <td className="num r">{num(a.advance)}</td>
                        <td className="num r">{num(a.monthly)}</td>
                        <td className={`num r strong ${a.remaining ? "text-red" : ""}`}>{num(a.remaining)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            );
          })}
          {visible.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={12} className="muted text-center" style={{ padding: "24px 8px" }}>
                  {q ? "No customers match this search." : "No customers to show."}
                </td>
              </tr>
            </tbody>
          )}
          {visible.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={8} className="r">
                  Totals · {agreementRows.length} agreements (Rs)
                </td>
                <td className="num r">{num(totals.price)}</td>
                <td className="num r">{num(totals.advance)}</td>
                <td className="num r">{num(totals.monthly)}</td>
                <td className="num r text-red">{num(totals.remaining)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

// Names and contacts sit in two columns, each as one line joined with " / "
// in the same order, so the nth name goes with the nth number.
function GuarantorNames({ group }: { group: CustomerGroup }) {
  if (group.guarantors.length === 0) {
    return (
      <span className="muted italic">
        {group.noGuarantorReason ? `No guarantor — ${group.noGuarantorReason}` : "—"}
      </span>
    );
  }
  return <span className="strong">{group.guarantors.map((g) => g.name).join(" / ")}</span>;
}

function GuarantorContacts({ group }: { group: CustomerGroup }) {
  if (group.guarantors.length === 0) return <span className="muted">—</span>;
  return <>{group.guarantors.map((g) => g.cell ?? "—").join(" / ")}</>;
}
