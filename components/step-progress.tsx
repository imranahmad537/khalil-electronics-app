"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepState {
  id: string;
  label: string;
  done: boolean;
  note: string;
}

export function StepProgress({
  steps,
  activeId,
  onStepClick,
}: {
  steps: StepState[];
  activeId: string;
  onStepClick: (id: string) => void;
}) {
  return (
    <div className="p-[14px_18px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const active = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStepClick(s.id)}
            className="flex items-center gap-2 shrink-0"
          >
            <span
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0",
                s.done ? "bg-g500 text-white" : active ? "bg-ink text-white" : "bg-soft text-ink2"
              )}
            >
              {s.done ? <Check size={14} strokeWidth={3} /> : i + 1}
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className={cn("text-[12.5px] font-bold", active ? "text-ink" : "text-ink2")}>{s.label}</span>
              <span className={cn("text-[10.5px]", s.done ? "text-g700" : "text-ink3")}>{s.note}</span>
            </span>
            {i < steps.length - 1 && <span className="w-6 h-px bg-line ml-1" />}
          </button>
        );
      })}
    </div>
  );
}
