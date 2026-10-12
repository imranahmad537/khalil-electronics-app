"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Pencil, X, XCircle } from "lucide-react";
import { cancelSaleAction, setBlacklistAction, updateCustomerAction, type CustomerEditInput } from "@/app/actions/customers";
import { MaskedInput } from "@/components/masked-input";
import { cellError, cnicError, maskCell, maskCnic } from "@/lib/validation";
import { enterToNextField } from "@/lib/enter-to-next";
import { MONEY_ACCOUNTS, type MoneyAccount } from "@/lib/payment";
import { money } from "@/lib/money";
import { showToast } from "@/lib/toast";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";
const pillCls = "border border-line cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-white";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[480px] max-w-full max-h-[92vh] overflow-y-auto bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[16.5px] font-extrabold m-0">{title}</h2>
          <button onClick={onClose} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EditCustomerButton({ customerId, initial }: { customerId: string; initial: CustomerEditInput }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (k: keyof CustomerEditInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    setTried(true);
    setError("");
    if (!form.fullName.trim() || cnicError(form.cnic) || cellError(form.cell, true) || cellError(form.cell2)) return;
    startTransition(async () => {
      const res = await updateCustomerAction(customerId, form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Customer details saved");
      setOpen(false);
      router.refresh();
    });
  }

  const err = (msg: string | null) => (tried && msg ? msg : undefined);

  return (
    <>
      <button
        onClick={() => {
          setForm(initial);
          setTried(false);
          setError("");
          setOpen(true);
        }}
        className={`${pillCls} text-ink2`}
      >
        <Pencil size={13} strokeWidth={2.4} />
        Edit details
      </button>
      {open && (
        <Modal title="Edit customer" onClose={() => setOpen(false)}>
          <div className="form-grid-2" onKeyDown={enterToNextField}>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Full name</label>
              <input className={inputCls} value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} />
              {tried && !form.fullName.trim() && <span className="text-[11px] font-semibold text-red">Required</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Father / husband</label>
              <input className={inputCls} value={form.fatherName} onChange={(e) => set("fatherName")(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>CNIC</label>
              <MaskedInput value={form.cnic} onChange={set("cnic")} mask={maskCnic} placeholder="00000-0000000-0" inputMode="numeric" error={err(cnicError(form.cnic))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Cell</label>
              <MaskedInput value={form.cell} onChange={set("cell")} mask={maskCell} placeholder="03XX-XXXXXXX" inputMode="numeric" error={err(cellError(form.cell, true))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Alternate cell</label>
              <MaskedInput value={form.cell2} onChange={set("cell2")} mask={maskCell} placeholder="03XX-XXXXXXX" inputMode="numeric" error={err(cellError(form.cell2))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Area</label>
              <input className={inputCls} value={form.area} onChange={(e) => set("area")(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 span-2">
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={form.address} onChange={(e) => set("address")(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 span-2">
              <label className={labelCls}>Occupation</label>
              <input className={inputCls} value={form.occupation} onChange={(e) => set("occupation")(e.target.value)} />
            </div>
          </div>
          {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
          <button onClick={submit} disabled={pending} className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60">
            {pending ? "Saving…" : "Save changes"}
          </button>
        </Modal>
      )}
    </>
  );
}

export function BlacklistButton({ customerId, name, blacklisted }: { customerId: string; name: string; blacklisted: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await setBlacklistAction(customerId, !blacklisted);
      showToast(res.ok ? (blacklisted ? `${name} removed from the blacklist` : `${name} blacklisted — no new installment sales`) : res.error);
      setConfirm(false);
      router.refresh();
    });
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1 text-[12px] font-semibold text-ink2">
        Blacklist {name}?
        <button onClick={run} disabled={pending} className="rounded-full px-[12px] py-[6px] font-bold bg-red text-white disabled:opacity-60">
          {pending ? "…" : "Yes, blacklist"}
        </button>
        <button onClick={() => setConfirm(false)} className="rounded-full px-[12px] py-[6px] font-bold border border-line bg-white">
          Cancel
        </button>
      </span>
    );
  }
  return (
    <button onClick={() => (blacklisted ? run() : setConfirm(true))} disabled={pending} className={`${pillCls} ${blacklisted ? "text-g700" : "text-red"} disabled:opacity-60`}>
      <Ban size={13} strokeWidth={2.4} />
      {blacklisted ? "Remove from blacklist" : "Blacklist"}
    </button>
  );
}

export function CancelSaleButton({
  customerId,
  agreementId,
  agreementNo,
  received,
}: {
  customerId: string;
  agreementId: string;
  agreementNo: number;
  received: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [refund, setRefund] = useState("");
  const [account, setAccount] = useState<MoneyAccount>("cash_in_hand");
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const refundNum = Number(refund.replace(/[^0-9.]/g, "")) || 0;

  function submit() {
    setError("");
    if (!reason.trim()) return setError("Give a reason for cancelling.");
    if (refundNum > received) return setError(`The refund can't be more than the ${money(received)} received.`);
    startTransition(async () => {
      const res = await cancelSaleAction({ customerId, agreementId, refund: refundNum, account, reason, restock });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`Agreement #${agreementNo} cancelled${refundNum ? ` · ${money(refundNum)} refund recorded` : ""}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setRefund("");
          setReason("");
          setRestock(true);
          setError("");
          setOpen(true);
        }}
        className={`${pillCls} text-red`}
      >
        <XCircle size={13} strokeWidth={2.4} />
        Cancel sale
      </button>
      {open && (
        <Modal title={`Cancel agreement #${agreementNo}`} onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3" onKeyDown={enterToNextField}>
            <p className="m-0 text-[12.5px] text-ink2 leading-[1.5]">
              The agreement stops collecting and leaves every balance. {money(received)} was received on it so far — enter how much (if any) is
              returned to the customer; it&apos;s recorded as money paid out.
            </p>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Reason</label>
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer returned the phone" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Refund (Rs)</label>
                <input className={`num ${inputCls}`} value={refund} onChange={(e) => setRefund(e.target.value)} inputMode="numeric" placeholder="0" />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Paid from</label>
                <select className={inputCls} value={account} onChange={(e) => setAccount(e.target.value as MoneyAccount)} disabled={!refundNum}>
                  {MONEY_ACCOUNTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink2">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
              The item came back — return it to stock
            </label>
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <button onClick={submit} disabled={pending} className="border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-red text-white disabled:opacity-60">
              {pending ? "Cancelling…" : "Cancel this sale"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
