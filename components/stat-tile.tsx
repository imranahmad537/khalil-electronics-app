import type { LucideIcon } from "lucide-react";

type Tone = "hero" | "good" | "warn" | "plain";

const TONE: Record<Tone, { bg: string; labelFg: string; valueFg: string; noteFg: string }> = {
  hero: { bg: "var(--g900)", labelFg: "rgba(255,255,255,.72)", valueFg: "#fff", noteFg: "rgba(255,255,255,.72)" },
  plain: { bg: "var(--panel)", labelFg: "var(--ink2)", valueFg: "var(--ink)", noteFg: "var(--ink2)" },
  good: { bg: "var(--panel)", labelFg: "var(--ink2)", valueFg: "var(--g700)", noteFg: "var(--g700)" },
  warn: { bg: "var(--panel)", labelFg: "var(--ink2)", valueFg: "#9a4a08", noteFg: "#9a4a08" },
};

export function StatTile({
  label,
  value,
  note,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  icon: LucideIcon;
}) {
  const t = TONE[tone];
  return (
    <div className="p-[17px_19px] rounded-[var(--r-lg)] shadow-[var(--sh)] flex flex-col gap-2" style={{ background: t.bg }}>
      <span className="flex items-center gap-[9px] text-[12.5px] font-bold" style={{ color: t.labelFg }}>
        <Icon size={16} strokeWidth={2.4} />
        {label}
      </span>
      <span className="num text-[27px] font-extrabold tracking-[-.8px] leading-[1.1]" style={{ color: t.valueFg }}>
        {value}
      </span>
      <span className="text-[11.5px] font-semibold" style={{ color: t.noteFg }}>
        {note}
      </span>
    </div>
  );
}
