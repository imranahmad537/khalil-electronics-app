"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { DataTable, type DataColumn, type DataRow } from "@/components/data-table";
import { money } from "@/lib/money";
import type { CustomerListReportRow } from "@/lib/data/reports";
import { GuarantorList } from "@/components/guarantor-list";
import { guarantorSearchText } from "@/lib/guarantors";

const COLUMNS: DataColumn[] = [
  { label: "S.No", align: "left" },
  { label: "Acc no", align: "left" },
  { label: "Customer", align: "left" },
  { label: "Guarantors", align: "left" },
  { label: "Inst. price", align: "right" },
  { label: "Installments", align: "left" },
  { label: "Per month", align: "right" },
  { label: "Advance", align: "right" },
  { label: "Remaining", align: "right" },
];

const GRID = "44px 80px minmax(140px,1.4fr) minmax(170px,1.6fr) 96px 92px 90px 90px 100px";

const amount = (v: number | null) => (v == null ? "—" : money(v));

// Printing prints what's filtered, so the search narrows the paper list too.
export function CustomerListReport({ rows }: { rows: CustomerListReportRow[] }) {
  const [query, setQuery] = useState("");

  const searchIndex = useMemo(
    () =>
      rows.map((r) =>
        [r.fullName, r.accNo, r.cell, guarantorSearchText(r.guarantors), r.noGuarantorReason ?? "", r.agreementNo ? `#${r.agreementNo}` : ""]
          .join(" ")
          .toLowerCase()
      ),
    [rows]
  );

  const q = query.trim().toLowerCase();
  const visible = q ? rows.filter((_, i) => searchIndex[i].includes(q)) : rows;

  const tableRows: DataRow[] = visible.map((r, i) => ({
    key: r.key,
    cells: [
      { kind: "text", text: String(i + 1), weight: 600 },
      { kind: "text", text: r.accNo, sub: r.agreementNo ? `#${r.agreementNo}` : "", weight: 700 },
      { kind: "text", text: r.fullName, sub: r.cell, weight: 700 },
      { kind: "node", node: <GuarantorList guarantors={r.guarantors} noGuarantorReason={r.noGuarantorReason} /> },
      { kind: "text", text: amount(r.totalPrice), weight: 700, align: "right" },
      {
        kind: "text",
        text: r.agreementNo == null ? "—" : r.planMonths ? `${r.planMonths} mo` : "Direct",
        sub: r.installmentCount ? `${r.paidCount}/${r.installmentCount} paid` : "",
        weight: 600,
      },
      { kind: "text", text: amount(r.monthly), weight: 600, align: "right" },
      { kind: "text", text: amount(r.advance), weight: 600, align: "right" },
      { kind: "text", text: amount(r.remaining), weight: 800, align: "right", fg: r.remaining ? "var(--red)" : undefined },
    ],
  }));

  const totalPrice = visible.reduce((t, r) => t + (r.totalPrice ?? 0), 0);
  const totalAdvance = visible.reduce((t, r) => t + (r.advance ?? 0), 0);
  const totalRemaining = visible.reduce((t, r) => t + (r.remaining ?? 0), 0);

  return (
    <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
      <div className="no-print flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] max-w-[460px] flex items-center gap-[9px] px-[14px] py-[9px] rounded-full bg-soft">
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
        {q && (
          <span className="text-[12px] font-semibold text-ink3">
            {visible.length} of {rows.length} rows
          </span>
        )}
      </div>

      {q && (
        <div className="print-only text-[11px] text-ink3">
          Filtered by “{query.trim()}” · {visible.length} of {rows.length} rows
        </div>
      )}

      <DataTable
        gridTemplate={GRID}
        columns={COLUMNS}
        rows={tableRows}
        minWidth={1080}
        emptyMessage={q ? "No customers match this search." : "No customers yet."}
      />
      <div className="px-1 py-3 text-xs text-ink2 font-bold">
        {money(totalPrice)} installment value · {money(totalAdvance)} advance · {money(totalRemaining)} remaining
      </div>
    </div>
  );
}
