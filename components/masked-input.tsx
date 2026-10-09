"use client";

import { cn } from "@/lib/utils";

export function MaskedInput({
  value,
  onChange,
  mask,
  error,
  className,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  mask: (raw: string) => string;
  error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="flex flex-col gap-1">
      <input
        value={value}
        onChange={(e) => onChange(mask(e.target.value))}
        className={cn(
          "px-[15px] py-[10px] rounded-xl border bg-soft text-[13.5px] text-ink outline-none disabled:opacity-60",
          error ? "border-red" : "border-line",
          className
        )}
        {...rest}
      />
      {error && <span className="text-[11px] font-semibold text-red">{error}</span>}
    </div>
  );
}
