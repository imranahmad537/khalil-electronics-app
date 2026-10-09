"use client";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Minus, Trash2, Box, AlertTriangle } from "lucide-react";
import { ProductCombobox } from "@/components/product-combobox";
import { money } from "@/lib/money";
import type { AgreementFormValues } from "@/lib/agreement-schema";
import type { ProductOption } from "@/lib/data/agreement-form";

const inputCls = "px-[12px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const GRID = "minmax(220px,2fr) minmax(120px,1fr) 110px minmax(110px,1fr) minmax(110px,1fr) 40px";

export function ProductLineTable({ products }: { products: ProductOption[] }) {
  const { control, formState } = useFormContext<AgreementFormValues>();
  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const itemsError = formState.errors.items;

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <Box size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0">Products</h2>
      </div>

      {fields.length > 0 ? (
        <div className="tblwrap">
          <div className="tblinner" style={{ minWidth: 760 }}>
            <div
              className="grid gap-2 px-1 pb-2 border-b border-line text-[10.5px] font-bold tracking-[.06em] uppercase text-ink3"
              style={{ gridTemplateColumns: GRID }}
            >
              <span>Product</span>
              <span>Serial / IMEI</span>
              <span>Qty</span>
              <span className="text-right">Unit price</span>
              <span className="text-right">Line total</span>
              <span />
            </div>

            {fields.map((row, i) => (
              <Row key={row.id} index={i} products={products} onRemove={() => remove(i)} update={update} />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-[13px] text-ink2 rounded-xl bg-soft">No products yet.</div>
      )}

      {itemsError?.message && <span className="text-[11px] font-semibold text-red">{itemsError.message}</span>}

      <button
        type="button"
        onClick={() => append({ productId: "", serialNo: "", qty: 1, unitPrice: 0 })}
        className="btng self-start border border-line cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-[12px] font-bold bg-white text-g700"
      >
        <Plus size={14} strokeWidth={2.4} />
        Add product
      </button>
    </div>
  );
}

function Row({
  index,
  products,
  onRemove,
  update,
}: {
  index: number;
  products: ProductOption[];
  onRemove: () => void;
  update: ReturnType<typeof useFieldArray<AgreementFormValues, "items">>["update"];
}) {
  const { control, watch } = useFormContext<AgreementFormValues>();
  const row = watch(`items.${index}`);
  const product = products.find((p) => p.id === row.productId);
  const overStock = !!product && row.qty > product.stock;
  const lineTotal = (Number(row.qty) || 0) * (Number(row.unitPrice) || 0);

  return (
    <div className="grid gap-2 items-center py-[10px] border-b border-line" style={{ gridTemplateColumns: GRID }}>
      <Controller
        name={`items.${index}.productId`}
        control={control}
        render={({ field }) => (
          <ProductCombobox
            products={products}
            value={field.value}
            onSelect={(p) => update(index, { ...row, productId: p.id, unitPrice: p.price })}
          />
        )}
      />

      <Controller
        name={`items.${index}.serialNo`}
        control={control}
        render={({ field }) => <input {...field} placeholder="IMEI / serial" className={inputCls} />}
      />

      <div className="flex items-center gap-1">
        <Controller
          name={`items.${index}.qty`}
          control={control}
          render={({ field }) => (
            <>
              <button
                type="button"
                onClick={() => field.onChange(Math.max(1, (Number(field.value) || 1) - 1))}
                className="w-7 h-7 rounded-full border border-line bg-white flex items-center justify-center text-ink2"
              >
                <Minus size={12} strokeWidth={3} />
              </button>
              <input
                value={field.value}
                onChange={(e) => field.onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                inputMode="numeric"
                className={`num ${inputCls} w-12 text-center px-1`}
              />
              <button
                type="button"
                onClick={() => field.onChange((Number(field.value) || 0) + 1)}
                className="w-7 h-7 rounded-full border border-line bg-white flex items-center justify-center text-ink2"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </>
          )}
        />
      </div>

      <Controller
        name={`items.${index}.unitPrice`}
        control={control}
        render={({ field }) => (
          <input
            value={field.value || ""}
            onChange={(e) => field.onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
            inputMode="numeric"
            className={`num ${inputCls} text-right`}
          />
        )}
      />

      <div className="flex flex-col items-end">
        <span className="num text-[13.5px] font-extrabold">{money(lineTotal)}</span>
        {overStock && (
          <span className="text-[10.5px] font-semibold text-red flex items-center gap-1">
            <AlertTriangle size={10} strokeWidth={3} />
            {product!.stock} in stock
          </span>
        )}
      </div>

      <button type="button" onClick={onRemove} className="w-9 h-9 rounded-full border border-line bg-white text-ink2 flex items-center justify-center">
        <Trash2 size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}
