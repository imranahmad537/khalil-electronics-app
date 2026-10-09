import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { REPORTS } from "@/lib/reports-config";
import { getCurrentPermissions } from "@/lib/current-user";

const TONE_BG: Record<string, string> = { good: "var(--g50)", plain: "var(--soft)", warn: "var(--red50)" };
const TONE_FG: Record<string, string> = { good: "var(--g700)", plain: "var(--ink2)", warn: "var(--red)" };

export default async function ReportsPage() {
  const permissions = await getCurrentPermissions();
  const visible = REPORTS.filter((r) => !r.requires || permissions[r.requires]);
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reports" hint={`${visible.length} reports · ${monthLabel}`} />

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(232px, 1fr))" }}>
        {visible.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.key}
              href={`/reports/${r.key}`}
              className="trow p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] cursor-pointer flex flex-col gap-[9px]"
            >
              <div className="flex items-center gap-[10px]">
                <span
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                  style={{ background: TONE_BG[r.tone], color: TONE_FG[r.tone] }}
                >
                  <Icon size={16} strokeWidth={2.4} />
                </span>
                <span className="flex-1 text-[10.5px] font-bold tracking-[.1em] uppercase text-ink3">{r.group}</span>
                <ArrowUpRight size={16} strokeWidth={2.4} className="text-ink3" />
              </div>
              <span className="text-[15.5px] font-extrabold">{r.name}</span>
              <span className="text-[12px] leading-[1.5] text-ink2">{r.note}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
