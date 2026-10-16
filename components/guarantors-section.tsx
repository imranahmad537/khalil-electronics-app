"use client";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { GuarantorCard } from "@/components/guarantor-card";
import { emptyGuarantor, type AgreementFormValues } from "@/lib/agreement-schema";
import { MAX_GUARANTORS, NO_GUARANTOR_REASONS } from "@/lib/guarantors";
import type { ExistingCustomerOption } from "@/lib/data/agreement-form";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";

// Installment sales take 1–4 guarantors, or none with a written reason
// (e.g. a relative). The reason is saved on the customer's file.
export function GuarantorsSection({
  selectedCustomer,
  defaulterCnics,
}: {
  selectedCustomer: ExistingCustomerOption | null;
  defaulterCnics: Set<string>;
}) {
  const { control, watch, setValue, formState } = useFormContext<AgreementFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "guarantors" });
  const mode = watch("mode");
  const useExisting = mode === "existing" && watch("useExistingGuarantors");
  const noGuarantor = watch("noGuarantor");
  const listError = formState.errors.guarantors?.root?.message ?? formState.errors.guarantors?.message;
  const reasonError = formState.errors.noGuarantorReason?.message;

  if (useExisting && selectedCustomer) {
    const onFile = selectedCustomer.guarantors;
    return (
      <Panel title="Guarantors" note="Using what's on file — untick “Use guarantors on file” above to change them.">
        {onFile.length > 0 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {onFile.map((g, i) => (
              <div key={g.slot} className="px-[14px] py-[10px] rounded-xl bg-soft flex flex-col">
                <span className="text-[11px] font-bold text-ink3 uppercase tracking-[.06em]">Guarantor {i + 1}</span>
                <span className="text-[13.5px] font-bold">{g.name}</span>
                <span className="num text-[11.5px] text-ink3">{[g.cell, g.cnic].filter(Boolean).join(" · ") || "—"}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-[13px] text-ink2">
            No guarantor required{selectedCustomer.noGuarantorReason ? ` — ${selectedCustomer.noGuarantorReason}` : ""}
          </span>
        )}
      </Panel>
    );
  }

  function setNoGuarantor(value: boolean) {
    setValue("noGuarantor", value);
    if (!value && fields.length === 0) append(emptyGuarantor());
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Guarantors" note={noGuarantor ? "This sale will be recorded without a guarantor." : `${fields.length} of up to ${MAX_GUARANTORS}`}>
        <div className="flex gap-[5px] p-1 bg-soft rounded-full self-start">
          <ToggleButton active={!noGuarantor} onClick={() => setNoGuarantor(false)} icon={<ShieldCheck size={14} strokeWidth={2.4} />}>
            With guarantors
          </ToggleButton>
          <ToggleButton active={noGuarantor} onClick={() => setNoGuarantor(true)} icon={<ShieldOff size={14} strokeWidth={2.4} />}>
            No guarantor
          </ToggleButton>
        </div>

        {noGuarantor && (
          <div className="flex flex-col gap-2">
            <label className="text-[11.5px] font-bold text-ink2">Reason *</label>
            <div className="flex gap-[6px] flex-wrap">
              {NO_GUARANTOR_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setValue("noGuarantorReason", r, { shouldValidate: formState.isSubmitted })}
                  className="cursor-pointer rounded-full px-[12px] py-[6px] text-[12px] font-bold border border-line bg-white text-ink2"
                >
                  {r}
                </button>
              ))}
            </div>
            <Controller
              name="noGuarantorReason"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  placeholder="e.g. Brother of the owner"
                  className={inputCls}
                  style={reasonError ? { borderColor: "var(--red)" } : undefined}
                />
              )}
            />
            {reasonError && <span className="text-[11px] font-semibold text-red">{reasonError}</span>}
          </div>
        )}
        {!noGuarantor && listError && <span className="text-[11px] font-semibold text-red">{listError}</span>}
      </Panel>

      {!noGuarantor && (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {fields.map((f, i) => (
              <GuarantorCard
                key={f.id}
                index={i}
                onRemove={fields.length > 1 ? () => remove(i) : undefined}
                defaulterCnics={defaulterCnics}
              />
            ))}
          </div>
          {fields.length < MAX_GUARANTORS && (
            <button
              type="button"
              onClick={() => append(emptyGuarantor())}
              className="self-start cursor-pointer rounded-full px-[16px] py-[9px] flex items-center gap-2 text-[12.5px] font-bold border border-dashed border-line bg-white text-ink2"
            >
              <Plus size={15} strokeWidth={2.4} />
              Add guarantor
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Panel({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px] flex-wrap">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <ShieldCheck size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0">{title}</h2>
        <span className="text-[11.5px] text-ink3 ml-auto">{note}</span>
      </div>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-0 cursor-pointer rounded-full px-[14px] py-[7px] flex items-center gap-[6px] text-[12.5px] font-bold"
      style={{ background: active ? "var(--ink)" : "transparent", color: active ? "#fff" : "var(--ink2)" }}
    >
      {icon}
      {children}
    </button>
  );
}
