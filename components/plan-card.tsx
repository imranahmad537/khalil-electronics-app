"use client";

import { money } from "@/lib/money";

export function PlanCard({
  label,
  monthly,
  note,
  selected,
  onClick,
}: {
  label: string;
  monthly: number | null;
  note: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 min-w-[140px] text-left p-4 rounded-2xl border-2 flex flex-col gap-1 transition-colors"
      style={{
        borderColor: selected ? "var(--g500)" : "var(--line)",
        background: selected ? "var(--g50)" : "var(--soft)",
      }}
    >
      <span className="text-[13.5px] font-extrabold" style={{ color: selected ? "var(--g900)" : "var(--ink)" }}>
        {label}
      </span>
      <span className="num text-[16px] font-extrabold" style={{ color: selected ? "var(--g700)" : "var(--ink2)" }}>
        {monthly !== null ? `${money(monthly)} / month` : "—"}
      </span>
      <span className="text-[11px] text-ink3">{note}</span>
    </button>
  );
}
