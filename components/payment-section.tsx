"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Receipt } from "lucide-react";
import { PlanCard } from "@/components/plan-card";
import { ScheduleTable } from "@/components/schedule-table";
import type { AgreementFormValues } from "@/lib/agreement-schema";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";
const MODES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
] as const;

function firstDueLabel() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export function PaymentSection({ total }: { total: number }) {
  const { control, watch, setValue, formState } = useFormContext<AgreementFormValues>();
  const plan = watch("plan");
  const errors = formState.errors;

  const monthlyFor = (p: 10 | 12) => Math.round(total / p) || 0;

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-4">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <Receipt size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0">Payment</h2>
      </div>

      <div className="flex gap-3 flex-wrap">
        <PlanCard label="12 months" monthly={total ? monthlyFor(12) : null} note="Lower monthly amount" selected={plan === 12} onClick={() => setValue("plan", 12)} />
        <PlanCard label="10 months" monthly={total ? monthlyFor(10) : null} note="Shorter term" selected={plan === 10} onClick={() => setValue("plan", 10)} />
        <PlanCard label="Direct sale" monthly={null} note="Full payment today" selected={plan === 0} onClick={() => setValue("plan", 0)} />
      </div>
      {errors.plan && <span className="text-[11px] font-semibold text-red">{errors.plan.message}</span>}

      <div className="form-grid-2">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Advance received</label>
          <Controller
            name="advance"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <span className="absolute left-[15px] top-1/2 -translate-y-1/2 text-[13.5px] text-ink3">Rs</span>
                <input
                  value={field.value || ""}
                  onChange={(e) => field.onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
                  inputMode="numeric"
                  className={`num ${inputCls} pl-[36px] w-full`}
                />
              </div>
            )}
          />
          {errors.advance && <span className="text-[11px] font-semibold text-red">{errors.advance.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Payment mode</label>
          <Controller
            name="paymentMode"
            control={control}
            render={({ field }) => (
              <div className="flex gap-[6px] flex-wrap">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => field.onChange(m.value)}
                    className="rounded-full px-[13px] py-[8px] text-[12px] font-bold border"
                    style={{
                      background: field.value === m.value ? "var(--ink)" : "#fff",
                      color: field.value === m.value ? "#fff" : "var(--ink2)",
                      borderColor: field.value === m.value ? "var(--ink)" : "var(--line)",
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
      </div>

      {plan !== 0 && plan !== null && (
        <>
          <div className="flex items-center justify-between text-[12.5px] px-3 py-[10px] rounded-xl bg-soft">
            <span className="text-ink2">First due date</span>
            <span className="font-bold">{firstDueLabel()}</span>
          </div>
          <p className="text-[12px] text-ink2 leading-[1.5]">
            Today: advance + 1st installment. Remaining {plan - 1} installments due 1st–5th of each month.
          </p>
          <ScheduleTable total={total} plan={plan} />
        </>
      )}
      {plan === 0 && (
        <p className="text-[12px] text-ink2 leading-[1.5]">Full payment collected at the counter — no installment schedule.</p>
      )}
    </div>
  );
}

export { firstDueLabel };
