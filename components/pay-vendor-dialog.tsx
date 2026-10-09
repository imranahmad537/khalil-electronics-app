"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Banknote } from "lucide-react";
import { recordVendorPaymentAction } from "@/app/actions/vendor-payments";
import { showToast } from "@/lib/toast";
import { money } from "@/lib/money";

export function PayVendorDialog({
  open,
  onClose,
  vendorId,
  vendorName,
  payable,
}: {
  open: boolean;
  onClose: () => void;
  vendorId: string;
  vendorName: string;
  payable: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(payable));
  const [account, setAccount] = useState<"cash_in_hand" | "meezan_bank" | "jazzcash">("meezan_bank");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!open) return null;

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await recordVendorPaymentAction({
        vendorId,
        amount: Number(amount.replace(/[^0-9.]/g, "")) || 0,
        account,
        notes,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`${money(Number(amount) || 0)} paid to ${vendorName}`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[420px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16.5px] font-extrabold m-0">{vendorName}</h2>
            <p className="mt-1 mb-0 text-[12px] text-ink2">Payable {money(payable)}</p>
          </div>
          <button
            onClick={onClose}
            className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-bold text-ink2">Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className="num px-[15px] py-[12px] rounded-xl border border-line bg-soft text-[16px] font-bold text-ink outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-bold text-ink2">Paid from</label>
          <select
            value={account}
            onChange={(e) => setAccount(e.target.value as typeof account)}
            className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
          >
            <option value="meezan_bank">Meezan Bank</option>
            <option value="cash_in_hand">Cash in hand</option>
            <option value="jazzcash">JazzCash</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11.5px] font-bold text-ink2">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
          />
        </div>

        {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

        <button
          onClick={submit}
          disabled={pending}
          className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] flex items-center justify-center gap-2 text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
        >
          <Banknote size={16} strokeWidth={2.4} />
          {pending ? "Posting…" : "Record payment"}
        </button>
      </div>
    </div>
  );
}
