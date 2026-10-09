"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Banknote, MessageCircle } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { CollectDialog } from "@/components/collect-dialog";
import { STATUS_META } from "@/lib/status";
import { money } from "@/lib/money";
import { queueReminderAction } from "@/app/actions/messages";
import { showToast } from "@/lib/toast";
import type { AvoCustomerCard } from "@/lib/data/avo";

export function AvoCustomerList({ officerName, customers }: { officerName: string; customers: AvoCustomerCard[] }) {
  const [query, setQuery] = useState("");
  const [collectFor, setCollectFor] = useState<AvoCustomerCard | null>(null);
  const [, startTransition] = useTransition();
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.fullName + " " + c.accNo + " " + c.cell + " " + (c.area ?? "")).toLowerCase().includes(q));
  }, [query, customers]);

  function remind(c: AvoCustomerCard) {
    startTransition(async () => {
      const res = await queueReminderAction({ customerId: c.customerId, amount: c.dueNow, monthLabel });
      showToast(res.ok ? `WhatsApp reminder queued for ${c.fullName}` : res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-[9px] px-[14px] py-[9px] rounded-full bg-panel shadow-[var(--sh)]">
        <Search size={16} strokeWidth={2.4} className="text-ink3" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search my customers…"
          className="flex-1 min-w-0 border-0 bg-transparent text-[13.5px] text-ink outline-none"
        />
      </div>

      {filtered.map((c) => {
        const meta = STATUS_META[c.status];
        const hasDue = c.dueNow > 0 && c.agreements.length > 0;
        return (
          <div key={c.customerId} className="rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] overflow-hidden flex">
            <span className="w-1 flex-none" style={{ background: meta.edge }} />
            <div className="flex-1 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[14.5px] font-bold truncate">{c.fullName}</div>
                  <div className="text-[11.5px] text-ink3">
                    Acc {c.accNo} · {c.cell} · {c.area ?? "—"}
                  </div>
                </div>
                <StatusChip status={c.status} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-[10px_12px] rounded-xl bg-soft flex flex-col gap-[2px]">
                  <span className="text-[10.5px] font-bold text-ink3 uppercase tracking-[.05em]">Due now</span>
                  <span className="num text-[15px] font-extrabold" style={{ color: hasDue ? "var(--red)" : "var(--ink)" }}>
                    {hasDue ? money(c.dueNow) : "Settled"}
                  </span>
                </div>
                <div className="p-[10px_12px] rounded-xl bg-soft flex flex-col gap-[2px]">
                  <span className="text-[10.5px] font-bold text-ink3 uppercase tracking-[.05em]">Remaining</span>
                  <span className="num text-[15px] font-extrabold">{money(c.remaining)}</span>
                </div>
              </div>

              <div className="flex gap-[8px]">
                <button
                  onClick={() => hasDue && setCollectFor(c)}
                  disabled={!hasDue}
                  className="flex-1 btnp border-0 cursor-pointer rounded-full py-[11px] flex items-center justify-center gap-[7px] text-[13px] font-bold bg-g600 text-white disabled:opacity-40"
                >
                  <Banknote size={15} strokeWidth={2.4} />
                  Collect
                </button>
                <button
                  onClick={() => remind(c)}
                  className="w-11 h-11 flex-none rounded-full border border-line bg-white text-g700 flex items-center justify-center"
                >
                  <MessageCircle size={16} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="p-7 text-center text-[13px] text-ink2 bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)]">
          {customers.length === 0 ? `No accounts assigned to ${officerName} yet.` : "No matches."}
        </div>
      )}

      {collectFor && (
        <CollectDialog
          open
          onClose={() => setCollectFor(null)}
          customerName={collectFor.fullName}
          accNo={collectFor.accNo}
          avoName={officerName}
          agreements={collectFor.agreements}
        />
      )}
    </div>
  );
}
