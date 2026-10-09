"use client";

import { Controller, useFormContext } from "react-hook-form";
import { CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { MaskedInput } from "@/components/masked-input";
import { maskCnic, maskCell, RELATIONS, type AgreementFormValues } from "@/lib/agreement-schema";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none disabled:opacity-60";
const labelCls = "text-[11.5px] font-bold text-ink2";

export function GuarantorCard({
  slot,
  title,
  disabled,
  defaulterCnics,
}: {
  slot: 1 | 2;
  title: string;
  disabled: boolean;
  defaulterCnics: Set<string>;
}) {
  const { control, watch, formState } = useFormContext<AgreementFormValues>();
  const fieldName = slot === 1 ? "guarantor1" : "guarantor2";
  const g = watch(fieldName);
  const errors = formState.errors[fieldName];
  const complete = !disabled && !!g.name.trim() && !!g.cnic && !!g.cell;
  const isDefaulter = g.cnic && defaulterCnics.has(g.cnic);

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <ShieldCheck size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0 flex-1">{title}</h2>
        {complete && <CheckCircle size={18} strokeWidth={2.4} className="text-g500" />}
      </div>

      <div className="form-grid-2">
        <div className="flex flex-col gap-1 span-2">
          <label className={labelCls}>Name *</label>
          <Controller
            name={`${fieldName}.name`}
            control={control}
            render={({ field }) => (
              <input {...field} disabled={disabled} placeholder="Asad Khan" className={inputCls} style={errors?.name ? { borderColor: "var(--red)" } : undefined} />
            )}
          />
          {errors?.name && <span className="text-[11px] font-semibold text-red">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>CNIC *</label>
          <Controller
            name={`${fieldName}.cnic`}
            control={control}
            render={({ field }) => (
              <MaskedInput value={field.value} onChange={field.onChange} mask={maskCnic} placeholder="00000-0000000-0" disabled={disabled} error={errors?.cnic?.message} />
            )}
          />
          {isDefaulter && (
            <span className="text-[11px] font-semibold text-red flex items-center gap-1">
              <AlertTriangle size={11} strokeWidth={2.6} />
              This person is a defaulter elsewhere
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Cell *</label>
          <Controller
            name={`${fieldName}.cell`}
            control={control}
            render={({ field }) => (
              <MaskedInput value={field.value} onChange={field.onChange} mask={maskCell} placeholder="03XX-XXXXXXX" disabled={disabled} error={errors?.cell?.message} />
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Relation</label>
          <Controller
            name={`${fieldName}.relation`}
            control={control}
            render={({ field }) => (
              <select {...field} disabled={disabled} className={inputCls}>
                {RELATIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Address</label>
          <Controller
            name={`${fieldName}.address`}
            control={control}
            render={({ field }) => <input {...field} disabled={disabled} className={inputCls} />}
          />
        </div>
      </div>
    </div>
  );
}
