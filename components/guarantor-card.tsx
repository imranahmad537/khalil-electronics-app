"use client";

import { Controller, useFormContext } from "react-hook-form";
import { CheckCircle, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { MaskedInput } from "@/components/masked-input";
import { maskCnic, maskCell, RELATIONS, type AgreementFormValues } from "@/lib/agreement-schema";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none disabled:opacity-60";
const labelCls = "text-[11.5px] font-bold text-ink2";

export function GuarantorCard({
  index,
  onRemove,
  defaulterCnics,
}: {
  index: number;
  /** Omitted when this is the only guarantor left. */
  onRemove?: () => void;
  defaulterCnics: Set<string>;
}) {
  const { control, watch, formState } = useFormContext<AgreementFormValues>();
  const fieldName = `guarantors.${index}` as const;
  const g = watch(fieldName);
  const errors = formState.errors.guarantors?.[index];
  const title = `Guarantor ${index + 1}`;
  const complete = !!g?.name.trim() && !!g?.cnic && !!g?.cell;
  const isDefaulter = !!g?.cnic && defaulterCnics.has(g.cnic);

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <ShieldCheck size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0 flex-1">{title}</h2>
        {complete && <CheckCircle size={18} strokeWidth={2.4} className="text-g500" />}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            title={`Remove ${title.toLowerCase()}`}
            className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink3 flex items-center justify-center"
          >
            <Trash2 size={15} strokeWidth={2.4} />
          </button>
        )}
      </div>

      <div className="form-grid-2">
        <div className="flex flex-col gap-1 span-2">
          <label className={labelCls}>Name *</label>
          <Controller
            name={`${fieldName}.name`}
            control={control}
            render={({ field }) => (
              <input {...field} placeholder="Asad Khan" className={inputCls} style={errors?.name ? { borderColor: "var(--red)" } : undefined} />
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
              <MaskedInput value={field.value} onChange={field.onChange} mask={maskCnic} placeholder="00000-0000000-0" error={errors?.cnic?.message} />
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
              <MaskedInput value={field.value} onChange={field.onChange} mask={maskCell} placeholder="03XX-XXXXXXX" error={errors?.cell?.message} />
            )}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelCls}>Relation</label>
          <Controller
            name={`${fieldName}.relation`}
            control={control}
            render={({ field }) => (
              <select {...field} className={inputCls}>
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
            render={({ field }) => <input {...field} className={inputCls} />}
          />
        </div>
      </div>
    </div>
  );
}
