import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

type Tone = "hero" | "good" | "warn" | "plain";

const TONE: Record<
  Tone,
  { bg: string; labelFg: string; valueFg: string; noteFg: string; iconFg: string; btnBg: string; btnFg: string }
> = {
  hero: {
    bg: "var(--g900)",
    labelFg: "rgba(255,255,255,.72)",
    valueFg: "#fff",
    noteFg: "rgba(255,255,255,.72)",
    iconFg: "rgba(255,255,255,.7)",
    btnBg: "rgba(255,255,255,.16)",
    btnFg: "#fff",
  },
  plain: {
    bg: "var(--panel)",
    labelFg: "var(--ink2)",
    valueFg: "var(--ink)",
    noteFg: "var(--ink2)",
    iconFg: "var(--ink2)",
    btnBg: "var(--soft)",
    btnFg: "var(--ink2)",
  },
  good: {
    bg: "var(--panel)",
    labelFg: "var(--ink2)",
    valueFg: "var(--g700)",
    noteFg: "var(--g700)",
    iconFg: "var(--g600)",
    btnBg: "var(--g50)",
    btnFg: "var(--g700)",
  },
  warn: {
    bg: "var(--panel)",
    labelFg: "var(--ink2)",
    valueFg: "#9a4a08",
    noteFg: "#9a4a08",
    iconFg: "#b06a10",
    btnBg: "var(--amber50)",
    btnFg: "#9a4a08",
  },
};

export function KpiCard({
  label,
  value,
  note,
  tone,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  note: string;
  tone: Tone;
  icon: LucideIcon;
  href: string;
}) {
  const t = TONE[tone];
  return (
    <div
      className="p-[18px_20px] rounded-[var(--r-lg)] shadow-[var(--sh)] flex flex-col gap-[9px]"
      style={{ background: t.bg }}
    >
      <div className="flex items-center gap-[9px]">
        <span className="flex" style={{ color: t.iconFg }}>
          <Icon size={17} strokeWidth={2.4} />
        </span>
        <span className="flex-1 text-[13px] font-bold" style={{ color: t.labelFg }}>
          {label}
        </span>
        <Link
          href={href}
          title={label}
          className="iconbtn border-0 cursor-pointer w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: t.btnBg, color: t.btnFg }}
        >
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </Link>
      </div>
      <span className="num text-[31px] font-extrabold tracking-[-1px] leading-[1.05]" style={{ color: t.valueFg }}>
        {value}
      </span>
      <span className="flex items-center gap-[6px] text-[11.5px] font-semibold" style={{ color: t.noteFg }}>
        {note}
      </span>
    </div>
  );
}
