"use client";

import { useTransition } from "react";
import { Send } from "lucide-react";
import { queueMonthRemindersAction } from "@/app/actions/messages";
import { showToast } from "@/lib/toast";

export function SendRemindersButton({
  customers,
  monthLabel,
}: {
  customers: { customerId: string; name: string; amount: number }[];
  monthLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const res = await queueMonthRemindersAction({ customers, monthLabel });
      showToast(
        res.ok
          ? `WhatsApp reminder queued to ${res.count} customer${res.count === 1 ? "" : "s"} for ${monthLabel}`
          : res.error
      );
    });
  }

  return (
    <button
      onClick={send}
      disabled={pending}
      className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white disabled:opacity-60"
      style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
    >
      <Send size={16} strokeWidth={2.4} />
      {pending ? "Queuing…" : "Send month reminders"}
    </button>
  );
}
