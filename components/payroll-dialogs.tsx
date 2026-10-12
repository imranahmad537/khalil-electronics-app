"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Banknote, Printer, Settings2, Undo2, X } from "lucide-react";
import { paySalaryAction, undoSalaryAction, updatePayRulesAction } from "@/app/actions/payroll";
import { MONEY_ACCOUNTS, type MoneyAccount } from "@/lib/payment";
import { deductionBreakdown, type PayFigures, type PayRules } from "@/lib/payroll";
import { enterToNextField } from "@/lib/enter-to-next";
import { money } from "@/lib/money";
import { showToast } from "@/lib/toast";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-[460px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
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

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "minus" | "plus" }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-ink2">{label}</span>
      <span className={`num ${strong ? "text-[16px] font-extrabold" : "font-bold"}`} style={{ color: tone === "minus" ? "var(--red)" : tone === "plus" ? "var(--g700)" : undefined }}>
        {value}
      </span>
    </div>
  );
}

export function PaySalaryButton({
  employeeId,
  name,
  month,
  monthLabel,
  salary,
  figures,
  monthOver,
}: {
  employeeId: string;
  name: string;
  month: string;
  monthLabel: string;
  salary: number;
  figures: PayFigures;
  monthOver: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adjustment, setAdjustment] = useState("");
  const [note, setNote] = useState("");
  const [account, setAccount] = useState<MoneyAccount>("cash_in_hand");
  const [error, setError] = useState("");
  const [paidId, setPaidId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const adj = Number(adjustment.replace(/[^0-9.-]/g, "")) || 0;
  const net = salary - figures.deduction + adj;

  function submit() {
    setError("");
    if (net < 0) return setError("Net pay can't be negative.");
    if (adj !== 0 && !note.trim()) return setError("Add a note explaining the adjustment.");
    startTransition(async () => {
      const res = await paySalaryAction({ employeeId, month, adjustment: adj, note, account });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPaidId(res.payslipId);
      showToast(`${name} paid ${money(net)} for ${monthLabel}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setAdjustment("");
          setNote("");
          setError("");
          setPaidId(null);
          setOpen(true);
        }}
        disabled={salary <= 0}
        title={salary <= 0 ? "No salary set — add it in Employees" : undefined}
        className="btnp border-0 cursor-pointer rounded-full px-[14px] py-[7px] flex items-center gap-[6px] text-xs font-bold bg-g600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Banknote size={13} strokeWidth={2.4} />
        Pay
      </button>
      {open && (
        <Modal title={paidId ? "Salary paid" : `Pay ${name} · ${monthLabel}`} onClose={() => setOpen(false)}>
          {paidId ? (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[13px] text-ink2">
                {money(net)} recorded as a Salaries expense from {MONEY_ACCOUNTS.find((a) => a.value === account)?.label}.
              </p>
              <div className="flex gap-2">
                <Link
                  href={`/payroll/slip/${paidId}`}
                  target="_blank"
                  className="flex-1 border border-line rounded-full py-3 flex items-center justify-center gap-2 text-[13px] font-bold bg-white text-g700"
                >
                  <Printer size={14} strokeWidth={2.4} />
                  Print payslip
                </Link>
                <button onClick={() => setOpen(false)} className="flex-1 btnp border-0 cursor-pointer rounded-full py-3 text-[13px] font-bold bg-g500 text-white">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3" onKeyDown={enterToNextField}>
              {!monthOver && (
                <div className="px-3 py-2 rounded-xl bg-amber50 text-[12px] font-semibold" style={{ color: "#8a5a10" }}>
                  {monthLabel} isn&apos;t over yet — only attendance up to today is counted.
                </div>
              )}
              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-soft">
                <Line label="Monthly salary" value={money(salary)} />
                <Line
                  label={`Deduction · ${figures.deductionDays} day${figures.deductionDays === 1 ? "" : "s"} × ${money(figures.perDay)}`}
                  value={figures.deduction ? `− ${money(figures.deduction)}` : money(0)}
                  tone={figures.deduction ? "minus" : undefined}
                />
                <span className="text-[11.5px] text-ink3">{deductionBreakdown(figures)}</span>
                {adj !== 0 && <Line label="Adjustment" value={`${adj > 0 ? "+ " : "− "}${money(Math.abs(adj))}`} tone={adj > 0 ? "plus" : "minus"} />}
                <div className="h-px bg-line my-1" />
                <Line label="Net pay" value={money(Math.max(0, net))} strong />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Adjustment (+ bonus / − advance)</label>
                  <input className={`num ${inputCls}`} value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0" inputMode="numeric" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Paid from</label>
                  <select className={inputCls} value={account} onChange={(e) => setAccount(e.target.value as MoneyAccount)}>
                    {MONEY_ACCOUNTS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {adj !== 0 && (
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Adjustment note</label>
                  <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Eid bonus / salary advance recovered" />
                </div>
              )}
              {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
              <button
                onClick={submit}
                disabled={pending}
                className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
              >
                {pending ? "Recording…" : `Pay ${money(Math.max(0, net))}`}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function UndoSalaryButton({ payslipId, name }: { payslipId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        title="Undo this payment"
        className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer"
      >
        <Undo2 size={14} strokeWidth={2.4} />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button
        onClick={() =>
          startTransition(async () => {
            const res = await undoSalaryAction(payslipId);
            showToast(res.ok ? `${name}'s payment was undone and its expense removed` : res.error);
            setConfirm(false);
            router.refresh();
          })
        }
        disabled={pending}
        className="rounded-full px-[10px] py-[6px] text-[11.5px] font-bold bg-red text-white disabled:opacity-60"
      >
        {pending ? "…" : "Undo payment"}
      </button>
      <button onClick={() => setConfirm(false)} className="rounded-full px-[10px] py-[6px] text-[11.5px] font-bold border border-line bg-white text-ink2">
        Keep
      </button>
    </span>
  );
}

export function PayRulesDialog({ rules }: { rules: PayRules }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(rules);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await updatePayRulesAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Deduction rules saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setForm(rules);
          setError("");
          setOpen(true);
        }}
        className="no-print border border-line cursor-pointer rounded-full px-[16px] py-[10px] flex items-center gap-2 text-[12.5px] font-bold bg-white text-ink2"
      >
        <Settings2 size={15} strokeWidth={2.4} />
        Deduction rules
      </button>
      {open && (
        <Modal title="Deduction rules" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>One day&apos;s pay</label>
              <select className={inputCls} value={form.payBasis} onChange={(e) => setForm((f) => ({ ...f, payBasis: e.target.value as PayRules["payBasis"] }))}>
                <option value="fixed_30">Monthly salary ÷ 30 (common practice)</option>
                <option value="working_days">Monthly salary ÷ working days in that month</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Lates</label>
              <select className={inputCls} value={form.latesPerDay} onChange={(e) => setForm((f) => ({ ...f, latesPerDay: Number(e.target.value) }))}>
                <option value={0}>Not deducted</option>
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Every {n} lates = 1 day&apos;s pay
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Leave</label>
              <select className={inputCls} value={form.paidLeave ? "paid" : "unpaid"} onChange={(e) => setForm((f) => ({ ...f, paidLeave: e.target.value === "paid" }))}>
                <option value="paid">Paid — leave isn&apos;t deducted</option>
                <option value="unpaid">Unpaid — each leave day is deducted</option>
              </select>
            </div>
            <p className="m-0 text-[12px] text-ink2 leading-[1.5]">
              Always deducted: each <b>absent</b> day, <b>½ day</b> for each half day, and days before the employee joined. Weekly off days and holidays are
              never deducted. Salaries already paid keep the figures they were paid with.
            </p>
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <button
              onClick={submit}
              disabled={pending}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save rules"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
