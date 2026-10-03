import { money, initials } from "@/lib/money";
import type { ReceiptItem } from "@/lib/data/dashboard";

export function ReceiptsToday({ receipts, total }: { receipts: ReceiptItem[]; total: number }) {
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[10px]">
      <div className="flex items-baseline gap-[9px]">
        <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Receipts today</h2>
        <span className="num text-[13px] font-extrabold text-g700">{money(total)}</span>
      </div>
      {receipts.map((r) => (
        <div key={r.id} className="flex items-center gap-[10px] py-[9px] border-b border-line">
          <div className="w-[30px] h-[30px] flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[11px] font-extrabold">
            {initials(r.name)}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <span className="text-[12.5px] font-bold overflow-hidden text-ellipsis whitespace-nowrap">{r.name}</span>
            <span className="text-[11px] text-ink3 overflow-hidden text-ellipsis whitespace-nowrap">{r.meta}</span>
          </div>
          <span className="num text-[13px] font-extrabold">{money(r.amount)}</span>
        </div>
      ))}
      {receipts.length === 0 && <div className="text-[13px] text-ink2 py-2">No receipts posted yet today.</div>}
    </div>
  );
}
