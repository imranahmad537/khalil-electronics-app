import { STATUS_META } from "@/lib/status";
import type { CustomerStatus } from "@/lib/types";

export function StatusChip({ status }: { status: CustomerStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-[6px] text-[11px] font-bold px-[10px] py-[5px] rounded-full whitespace-nowrap"
      style={{ background: meta.chipBg, color: meta.chipFg }}
    >
      <Icon size={12} strokeWidth={3} />
      {meta.label}
    </span>
  );
}
