"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import type { LedgerIndexRow } from "@/lib/data/reports";

export function LedgerSearch({ customers }: { customers: LedgerIndexRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers.filter((c) => (c.fullName + " " + c.accNo + " " + c.cell).toLowerCase().includes(q)).slice(0, 30);
  }, [query, customers]);

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px] px-[14px] py-[9px] rounded-full bg-soft">
        <Search size={16} strokeWidth={2.4} className="text-ink3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, account or cell…"
          className="flex-1 min-w-0 border-0 bg-transparent text-[13.5px] text-ink outline-none"
        />
      </div>
      <div className="flex flex-col">
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/customers/${c.id}`}
            className="flex items-center gap-3 py-[11px] border-b border-line hover:bg-soft -mx-1 px-1 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold">{c.fullName}</div>
              <div className="text-[11.5px] text-ink3">
                Acc {c.accNo} · {c.cell}
              </div>
            </div>
            <ArrowUpRight size={16} strokeWidth={2.4} className="text-ink3" />
          </Link>
        ))}
        {filtered.length === 0 && <div className="text-[13px] text-ink2 py-3">No matches.</div>}
      </div>
    </div>
  );
}
