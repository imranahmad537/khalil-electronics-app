"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Banknote, BookOpen, MessageCircle } from "lucide-react";
import { CollectDialog, type CollectAgreement } from "@/components/collect-dialog";
import { queueReminderAction } from "@/app/actions/messages";
import { showToast } from "@/lib/toast";

export function RowActions({
  customerId,
  customerName,
  cell,
  accNo,
  avoName,
  dueNow,
  monthLabel,
  agreements,
}: {
  customerId: string;
  customerName: string;
  cell: string;
  accNo: string;
  avoName: string;
  dueNow: number;
  monthLabel: string;
  agreements: CollectAgreement[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const hasDue = dueNow > 0 && agreements.length > 0;

  function remind() {
    startTransition(async () => {
      const res = await queueReminderAction({ customerId, monthLabel });
      showToast(
        res.ok ? `WhatsApp reminder queued for ${customerName} · ${cell}` : res.error
      );
    });
  }

  return (
    <div className="flex justify-end gap-[7px]">
      {hasDue ? (
        <button
          onClick={() => setOpen(true)}
          className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold"
          style={{ background: "var(--g600)", color: "#fff" }}
        >
          <Banknote size={15} strokeWidth={2.4} />
          Collect
        </button>
      ) : (
        <Link
          href={`/customers/${customerId}`}
          className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold"
          style={{ background: "#fff", color: "var(--ink2)", border: "1px solid var(--line)" }}
        >
          <BookOpen size={15} strokeWidth={2.4} />
          Ledger
        </Link>
      )}
      <button
        onClick={remind}
        disabled={dueNow <= 0}
        title={dueNow > 0 ? "Send WhatsApp reminder" : "Nothing due — no reminder needed"}
        className="btng border border-line cursor-pointer rounded-full w-[34px] h-[34px] flex items-center justify-center bg-white text-g700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <MessageCircle size={16} strokeWidth={2.4} />
      </button>

      {hasDue && (
        <CollectDialog
          open={open}
          onClose={() => setOpen(false)}
          customerName={customerName}
          accNo={accNo}
          avoName={avoName}
          agreements={agreements}
        />
      )}
    </div>
  );
}
