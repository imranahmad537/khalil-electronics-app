import { PageHeader } from "@/components/page-header";
import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  hint,
  icon: Icon,
  note,
}: {
  title: string;
  hint: string;
  icon: LucideIcon;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} hint={hint} />
      <div className="flex-1 min-h-[320px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col items-center justify-center gap-3 text-center p-10">
        <div className="w-14 h-14 rounded-2xl bg-g50 text-g700 flex items-center justify-center">
          <Icon size={26} strokeWidth={2.2} />
        </div>
        <h2 className="text-[16.5px] font-extrabold m-0">{title} is next on the build list</h2>
        <p className="m-0 text-[13px] text-ink2 max-w-[420px]">{note}</p>
      </div>
    </div>
  );
}
