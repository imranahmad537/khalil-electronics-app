"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createProductAction } from "@/app/actions/products";
import { showToast } from "@/lib/toast";
import type { SelectOption } from "@/lib/data/products";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

export function AddProductDialog({ categories, vendors }: { categories: SelectOption[]; vendors: SelectOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    vendorId: "",
    model: "",
    cost: "",
    price: "",
    stock: "",
    minStock: "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await createProductAction({
        name: form.name,
        categoryId: form.categoryId || null,
        vendorId: form.vendorId || null,
        model: form.model,
        cost: Number(form.cost) || 0,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`${form.name} added to the catalogue`);
      setOpen(false);
      setForm({ name: "", categoryId: "", vendorId: "", model: "", cost: "", price: "", stock: "", minStock: "" });
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
        Add product
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[480px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <h2 className="text-[16.5px] font-extrabold m-0">Add product</h2>
              <button
                onClick={() => setOpen(false)}
                className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Vendor</label>
                <select className={inputCls} value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)}>
                  <option value="">—</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Model</label>
              <input className={inputCls} value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Cost</label>
                <input className={`num ${inputCls}`} inputMode="numeric" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Price</label>
                <input className={`num ${inputCls}`} inputMode="numeric" value={form.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Opening stock</label>
                <input className={`num ${inputCls}`} inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Minimum stock</label>
                <input className={`num ${inputCls}`} inputMode="numeric" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
              </div>
            </div>

            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

            <button
              onClick={submit}
              disabled={pending || !form.name.trim()}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save product"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
