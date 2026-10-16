"use client";

import { useState } from "react";
import { ChevronDown, CalendarDays } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { money } from "@/lib/money";

function monthLabel(offsetFromNext: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1 + offsetFromNext);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function ScheduleTable({ total, plan }: { total: number; plan: number }) {
  const [open, setOpen] = useState(false);
  const monthly = Math.round(total / plan) || 0;

  const rows = Array.from({ length: plan }, (_, i) => {
    const seq = i + 1;
    if (seq === 1) {
      return { seq, label: "Today (signing)", amount: monthly };
    }
    const amount = seq === plan ? total - monthly * (plan - 1) : monthly;
    return { seq, label: monthLabel(seq - 2), amount };
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className="flex items-center gap-2 text-[12.5px] font-bold text-g700">
          <CalendarDays size={14} strokeWidth={2.4} />
          View schedule
          <ChevronDown size={14} strokeWidth={2.4} className={open ? "rotate-180" : ""} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 flex flex-col rounded-xl border border-line overflow-hidden">
          <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-soft text-[10.5px] font-bold uppercase tracking-[.06em] text-ink3">
            <span>#</span>
            <span>Due</span>
            <span className="text-right">Amount</span>
          </div>
          {rows.map((r) => (
            <div key={r.seq} className="grid grid-cols-3 gap-2 px-3 py-[9px] border-t border-line text-[12.5px]">
              <span className="text-ink3">{r.seq}</span>
              <span className="font-semibold">{r.label}</span>
              <span className="num text-right font-bold">{money(r.amount)}</span>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
