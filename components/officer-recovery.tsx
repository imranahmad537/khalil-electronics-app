import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { money, initials } from "@/lib/money";
import type { OfficerStat } from "@/lib/data/dashboard";

export function OfficerRecovery({ officers }: { officers: OfficerStat[] }) {
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[15px]">
      <div className="flex items-center gap-[9px]">
        <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Officer recovery</h2>
        <Link
          href="/recovery"
          title="AVO & recovery"
          className="iconbtn border-0 cursor-pointer w-7 h-7 rounded-full bg-soft text-ink2 flex items-center justify-center"
        >
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </Link>
      </div>
      {officers.map((o) => (
        <div key={o.id} className="flex flex-col gap-[6px]">
          <div className="flex items-center gap-[9px]">
            <span className="w-[26px] h-[26px] flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[10.5px] font-extrabold">
              {initials(o.name)}
            </span>
            <span className="text-[13px] font-bold flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
              {o.name}
            </span>
            <span
              className="num text-[12.5px] font-extrabold"
              style={{ color: o.pct >= 60 ? "var(--g700)" : "var(--ink2)" }}
            >
              {o.pct}%
            </span>
          </div>
          <div className="h-[7px] rounded-full bg-soft overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${o.pct}%`,
                background: o.pct >= 60 ? "var(--g500)" : o.pct >= 25 ? "var(--amber)" : "var(--overdue)",
              }}
            />
          </div>
          <div className="num flex gap-2 text-[11px] text-ink3">
            <span>
              {money(o.collected)} / {money(o.target)}
            </span>
            <span className="flex-1 text-right">
              {o.assigned} accounts · {o.pending} pending
            </span>
          </div>
        </div>
      ))}
      {officers.length === 0 && (
        <div className="text-[13px] text-ink2">No active AVOs assigned yet.</div>
      )}
    </div>
  );
}
