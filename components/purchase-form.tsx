"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createPurchaseAction } from "@/app/actions/purchases";
import { showToast } from "@/lib/toast";
import { money } from "@/lib/money";
import { todayLocalDateStr } from "@/lib/local-date";
import type { SelectOption, ProductOption } from "@/lib/data/products";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

interface Row {
  productId: string;
  qty: string;
  unitCost: string;
}

export function PurchaseForm({ vendors, products }: { vendors: SelectOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [vendorId, setVendorId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState(() => todayLocalDateStr());
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ productId: "", qty: "1", unitCost: "" }]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function addRow() {
    setRows((r) => [...r, { productId: "", qty: "1", unitCost: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateRow(i, { productId, unitCost: p ? String(p.cost) : "" });
  }

  const total = rows.reduce((t, r) => t + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0);

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await createPurchaseAction({
        vendorId,
        billNo,
        billDate,
        notes,
        items: rows.map((r) => ({
          productId: r.productId,
          qty: Number(r.qty) || 0,
          unitCost: Number(r.unitCost) || 0,
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Purchase bill recorded");
      router.push("/vendors");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Vendor</label>
          <select className={inputCls} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Choose vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Bill no.</label>
          <input className={inputCls} value={billNo} onChange={(e) => setBillNo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Bill date</label>
          <input type="date" className={inputCls} value={billDate} onChange={(e) => setBillDate(e.target.value)} />
        </div>
        <div className="col-span-3 flex flex-col gap-1">
          <label className={labelCls}>Notes</label>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
        <h2 className="text-[15.5px] font-extrabold m-0">Items</h2>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 items-end" style={{ gridTemplateColumns: "2fr 90px 130px 36px" }}>
            <div className="flex flex-col gap-1">
              {i === 0 && <label className={labelCls}>Product</label>}
              <select className={inputCls} value={row.productId} onChange={(e) => onPickProduct(i, e.target.value)}>
                <option value="">Choose product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              {i === 0 && <label className={labelCls}>Qty</label>}
              <input
                className={`num ${inputCls}`}
                inputMode="numeric"
                value={row.qty}
                onChange={(e) => updateRow(i, { qty: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              {i === 0 && <label className={labelCls}>Unit cost</label>}
              <input
                className={`num ${inputCls}`}
                inputMode="numeric"
                value={row.unitCost}
                onChange={(e) => updateRow(i, { unitCost: e.target.value })}
              />
            </div>
            <button
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              className="w-9 h-9 rounded-full border border-line bg-white text-ink2 flex items-center justify-center disabled:opacity-40"
            >
              <Trash2 size={15} strokeWidth={2.4} />
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="btng self-start border border-line cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-white text-g700"
        >
          <Plus size={14} strokeWidth={2.4} />
          Add item
        </button>
      </div>

      <div
        className="p-[19px_22px] rounded-[var(--r-lg)] flex items-center justify-between gap-4 flex-wrap"
        style={{ background: "var(--g900)", color: "#fff" }}
      >
        <div>
          <div className="text-[12px] font-bold text-white/70">Bill total</div>
          <div className="num text-[22px] font-extrabold">{money(total)}</div>
        </div>
        <button
          onClick={submit}
          disabled={pending || !vendorId}
          className="btnp border-0 cursor-pointer rounded-full px-6 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save purchase"}
        </button>
      </div>
      {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
    </div>
  );
}
