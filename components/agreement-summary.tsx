"use client";

import { Loader2 } from "lucide-react";
import { RequiredChecklist, type ChecklistItem } from "@/components/required-checklist";

export interface SummaryRow {
  label: string;
  value: string;
  big?: boolean;
}

export function AgreementSummary({
  rows,
  checklist,
  missingCount,
  pending,
  isDirect,
  onSubmit,
}: {
  rows: SummaryRow[];
  checklist: ChecklistItem[];
  missingCount: number;
  pending: boolean;
  isDirect: boolean;
  onSubmit: () => void;
}) {
  const canSubmit = missingCount === 0 && !pending;

  return (
    <div className="lg:sticky lg:top-3.5 flex flex-col gap-4">
      <div className="p-[20px_22px] rounded-[var(--r-lg)] flex flex-col gap-3" style={{ background: "var(--g900)", color: "#fff" }}>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,.65)" }}>
              {r.label}
            </span>
            <span className={`num font-extrabold ${r.big ? "text-[22px]" : "text-[14px]"}`}>{r.value}</span>
          </div>
        ))}

        <div className="h-px my-1" style={{ background: "rgba(255,255,255,.14)" }} />

        <RequiredChecklist items={checklist} />

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="btnp mt-1 border-0 cursor-pointer rounded-full px-5 py-[14px] flex items-center justify-center gap-2 text-[13.5px] font-extrabold text-white disabled:cursor-not-allowed"
          style={{ background: canSubmit ? "var(--g500)" : "rgba(255,255,255,.14)" }}
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {pending
            ? "Saving…"
            : canSubmit
              ? isDirect
                ? "Save & print invoice"
                : "Save & send for verification"
              : `Complete ${missingCount} more item${missingCount === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
