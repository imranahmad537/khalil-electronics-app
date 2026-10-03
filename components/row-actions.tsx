"use client";

import { useState, useTransition } from "react";
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
      const res = await queueReminderAction({ customerId, amount: dueNow, monthLabel });
      showToast(
        res.ok ? `WhatsApp reminder queued for ${customerName} · ${cell}` : res.error
      );
    });
  }

  return (
    <div className="flex justify-end gap-[7px]">
      <button
        onClick={() =>
          hasDue ? setOpen(true) : showToast("Customer ledger screen is next on the build list")
        }
        className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold"
        style={
          hasDue
            ? { background: "var(--g600)", color: "#fff" }
            : { background: "#fff", color: "var(--ink2)", border: "1px solid var(--line)" }
        }
      >
        {hasDue ? <Banknote size={15} strokeWidth={2.4} /> : <BookOpen size={15} strokeWidth={2.4} />}
        {hasDue ? "Collect" : "Ledger"}
      </button>
      <button
        onClick={remind}
        title="Send WhatsApp reminder"
        className="btng border border-line cursor-pointer rounded-full w-[34px] h-[34px] flex items-center justify-center bg-white text-g700"
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
