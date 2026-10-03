"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Banknote } from "lucide-react";
import { money } from "@/lib/money";
import { postReceiptAction } from "@/app/actions/receipts";
import { showToast } from "@/lib/toast";

export interface CollectAgreement {
  id: string;
  label: string;
  monthly: number;
  due: number;
}

export function CollectDialog({
  open,
  onClose,
  customerName,
  accNo,
  avoName,
  agreements,
}: {
  open: boolean;
  onClose: () => void;
  customerName: string;
  accNo: string;
  avoName: string;
  agreements: CollectAgreement[];
}) {
  const router = useRouter();
  const [agreementId, setAgreementId] = useState(agreements[0]?.id ?? "");
  const selected = agreements.find((a) => a.id === agreementId) ?? agreements[0];
  const [amount, setAmount] = useState(String(selected?.due ?? 0));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const typed = useMemo(() => Number(amount.replace(/[^0-9.]/g, "")) || 0, [amount]);
  const gap = (selected?.due ?? 0) - typed;

  if (!open || !selected) return null;

  const hint =
    gap > 0
      ? { bg: "var(--amber50)", fg: "#8a5a10", text: `${money(gap)} short → carries to next month` }
      : gap < 0
        ? { bg: "var(--g50)", fg: "var(--g700)", text: `${money(-gap)} extra → reduces next month` }
        : { bg: "var(--soft)", fg: "var(--ink2)", text: "Pays this installment exactly" };

  function pickAgreement(id: string) {
    setAgreementId(id);
    const a = agreements.find((x) => x.id === id);
    if (a) setAmount(String(a.due));
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await postReceiptAction({ agreementId: selected.id, amount: typed });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`${money(typed)} received from ${customerName}`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[452px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16.5px] font-extrabold m-0">{customerName}</h2>
            <p className="mt-1 mb-0 text-[12px] text-ink2">
              Acc {accNo} · {selected.label} · {avoName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        {agreements.length > 1 && (
          <select
            value={agreementId}
            onChange={(e) => pickAgreement(e.target.value)}
            className="px-[14px] py-[10px] rounded-xl border border-line bg-soft text-[12.5px] font-semibold text-ink"
          >
            {agreements.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} · due {money(a.due)}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-[14px_15px] rounded-2xl bg-soft flex flex-col gap-1">
            <span className="text-[11px] font-bold text-ink2">Monthly</span>
            <span className="num text-[18px] font-extrabold">{money(selected.monthly)}</span>
          </div>
          <div className="p-[14px_15px] rounded-2xl bg-g900 text-white flex flex-col gap-1">
            <span className="text-[11px] font-bold text-white/70">Due now</span>
            <span className="num text-[18px] font-extrabold">{money(selected.due)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11.5px] font-bold text-ink2">Amount received</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            className="num px-[15px] py-[12px] rounded-xl border border-line bg-soft text-[16px] font-bold text-ink outline-none"
          />
          <div className="flex gap-[6px]">
            {[
              { label: "Full", value: selected.due },
              { label: "Monthly only", value: selected.monthly },
              { label: "Half", value: Math.round(selected.due / 2) },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => setAmount(String(p.value))}
                className="btng border border-line bg-white cursor-pointer rounded-full px-[12px] py-[6px] text-[11.5px] font-bold text-g700"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div
            className="px-[13px] py-[10px] rounded-xl text-[12px] font-semibold"
            style={{ background: hint.bg, color: hint.fg }}
          >
            {hint.text}
          </div>
          {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
        </div>

        <button
          onClick={submit}
          disabled={pending || typed <= 0}
          className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] flex items-center justify-center gap-2 text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
        >
          <Banknote size={16} strokeWidth={2.4} />
          {pending ? "Posting…" : "Post receipt"}
        </button>
      </div>
    </div>
  );
}
