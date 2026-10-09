"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { money } from "@/lib/money";
import type { ProductOption } from "@/lib/data/agreement-form";

export function ProductCombobox({
  products,
  value,
  onSelect,
}: {
  products: ProductOption[];
  value: string;
  onSelect: (product: ProductOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-left outline-none"
        >
          <span className={selected ? "text-ink font-semibold truncate" : "text-ink3 truncate"}>
            {selected ? selected.name : "Choose product"}
          </span>
          <ChevronDown size={14} strokeWidth={2.4} className="text-ink3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px]">
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No products found.</CommandEmpty>
            {products.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.name} ${p.categoryName ?? ""}`}
                onSelect={() => {
                  onSelect(p);
                  setOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold truncate">{p.name}</div>
                  <div className="text-[11px] text-ink3">
                    {p.categoryName ?? "—"} · stock {p.stock}
                  </div>
                </div>
                <span className="num text-[12.5px] font-extrabold">{money(p.price)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
