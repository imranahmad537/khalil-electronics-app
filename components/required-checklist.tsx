import { CheckCircle, Circle } from "lucide-react";

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export function RequiredChecklist({ items }: { items: ChecklistItem[] }) {
  return (
    <div className="flex flex-col gap-[6px]">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-[8px] text-[12.5px]" style={{ color: item.done ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.55)" }}>
          {item.done ? (
            <CheckCircle size={15} strokeWidth={2.4} className="text-g300 shrink-0" />
          ) : (
            <Circle size={15} strokeWidth={2.4} className="shrink-0" style={{ color: "rgba(255,255,255,.35)" }} />
          )}
          {item.label}
        </div>
      ))}
    </div>
  );
}
