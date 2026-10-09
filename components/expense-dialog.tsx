"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createExpenseAction, updateExpenseAction, type ExpenseInput } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/expense-categories";
import type { ExpenseRow } from "@/lib/data/expenses";
import { showToast } from "@/lib/toast";
import { todayLocalDateStr } from "@/lib/local-date";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

function today() {
  return todayLocalDateStr();
}

function blankForm(existing?: ExpenseRow): ExpenseInput {
  if (existing) {
    return {
      category: existing.category,
      description: existing.description ?? "",
      amount: existing.amount,
      account: existing.account as ExpenseInput["account"],
      spentOn: existing.spentOn,
    };
  }
  return { category: EXPENSE_CATEGORIES[0], description: "", amount: 0, account: "cash_in_hand", spentOn: today() };
}

function DialogShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[420px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-[16.5px] font-extrabold m-0">{title}</h2>
          <button
            onClick={onClose}
            className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ExpenseFields({
  form,
  setForm,
}: {
  form: ExpenseInput;
  setForm: React.Dispatch<React.SetStateAction<ExpenseInput>>;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Category</label>
        <select className={inputCls} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Description</label>
        <input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Amount</label>
          <input
            className={`num ${inputCls}`}
            inputMode="numeric"
            value={form.amount || ""}
            onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={form.spentOn} onChange={(e) => setForm((f) => ({ ...f, spentOn: e.target.value }))} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Paid from</label>
        <select
          className={inputCls}
          value={form.account}
          onChange={(e) => setForm((f) => ({ ...f, account: e.target.value as ExpenseInput["account"] }))}
        >
          <option value="cash_in_hand">Cash in hand</option>
          <option value="meezan_bank">Meezan Bank</option>
          <option value="jazzcash">JazzCash</option>
        </select>
      </div>
    </>
  );
}

export function AddExpenseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(blankForm());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await createExpenseAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Expense voucher saved");
      setOpen(false);
      setForm(blankForm());
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
        style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
      >
        <Plus size={16} strokeWidth={2.4} />
        New voucher
      </button>
      <DialogShell open={open} onClose={() => setOpen(false)} title="New voucher">
        <ExpenseFields form={form} setForm={setForm} />
        {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
        <button
          onClick={submit}
          disabled={pending}
          className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save voucher"}
        </button>
      </DialogShell>
    </>
  );
}

export function EditExpenseButton({ expense }: { expense: ExpenseRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExpenseInput>(blankForm(expense));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await updateExpenseAction(expense.id, form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Voucher updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border border-line cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-white text-ink2"
      >
        Edit
      </button>
      <DialogShell open={open} onClose={() => setOpen(false)} title="Edit voucher">
        <ExpenseFields form={form} setForm={setForm} />
        {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
        <button
          onClick={submit}
          disabled={pending}
          className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </DialogShell>
    </>
  );
}
