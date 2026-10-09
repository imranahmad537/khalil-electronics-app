"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, ShieldCheck, Box, Receipt, Plus, Trash2 } from "lucide-react";
import { createNewAgreementAction } from "@/app/actions/agreements";
import { showToast } from "@/lib/toast";
import { money } from "@/lib/money";
import type { ExistingCustomerOption, ProductOption } from "@/lib/data/agreement-form";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none disabled:opacity-60";
const labelCls = "text-[11.5px] font-bold text-ink2";

interface ItemRow {
  productId: string;
  qty: string;
  unitPrice: string;
  serialNo: string;
}

function Card({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <Icon size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function AgreementForm({ customers, products }: { customers: ExistingCustomerOption[]; products: ProductOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    fullName: "",
    cell: "",
    cnic: "",
    address: "",
    area: "",
    g1Name: "",
    g1Cell: "",
    g2Name: "",
    g2Cell: "",
  });

  const [items, setItems] = useState<ItemRow[]>([{ productId: "", qty: "1", unitPrice: "", serialNo: "" }]);
  const [saleType, setSaleType] = useState<"installment" | "direct">("installment");
  const [planMonths, setPlanMonths] = useState<10 | 12>(12);
  const [advance, setAdvance] = useState("");

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 20);
    return customers
      .filter((c) => (c.fullName + " " + c.accNo + " " + c.cell).toLowerCase().includes(q))
      .slice(0, 20);
  }, [search, customers]);

  const selected = customers.find((c) => c.id === customerId) ?? null;

  function setNC<K extends keyof typeof newCustomer>(key: K, value: string) {
    setNewCustomer((f) => ({ ...f, [key]: value }));
  }

  function addItem() {
    setItems((r) => [...r, { productId: "", qty: "1", unitPrice: "", serialNo: "" }]);
  }
  function removeItem(i: number) {
    setItems((r) => r.filter((_, idx) => idx !== i));
  }
  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function onPickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId);
    updateItem(i, { productId, unitPrice: p ? String(p.price) : "" });
  }

  function selectPlan(p: 10 | 12 | 0) {
    if (p === 0) {
      setSaleType("direct");
    } else {
      setSaleType("installment");
      setPlanMonths(p);
    }
  }

  const total = items.reduce((t, r) => t + (Number(r.qty) || 0) * (Number(r.unitPrice) || 0), 0);
  const advanceNum = Number(advance.replace(/[^0-9.]/g, "")) || 0;
  const monthly = saleType === "installment" ? Math.round(total / planMonths) || 0 : 0;

  const summary =
    saleType === "installment"
      ? [
        { label: "Monthly installment", value: money(monthly), note: `sale price ÷ ${planMonths}` },
        { label: "Collect today", value: money(advanceNum + monthly), note: "advance + first installment" },
        { label: "Months remaining", value: String(planMonths - 1), note: "due from next month" },
        { label: "Balance", value: money(Math.max(0, total - advanceNum - monthly)), note: `over ${planMonths - 1} installments` },
      ]
      : [
        { label: "Direct sale", value: money(total), note: "full payment at the counter" },
        { label: "Received", value: money(advanceNum), note: "cash or bank" },
        { label: "Balance", value: money(Math.max(0, total - advanceNum)), note: "settle before delivery" },
      ];

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await createNewAgreementAction({
        existingCustomerId: mode === "existing" ? customerId || null : null,
        newCustomer: mode === "new" ? newCustomer : null,
        saleType,
        planMonths: saleType === "installment" ? planMonths : null,
        advance: advanceNum,
        items: items
          .filter((i) => i.productId && Number(i.qty) > 0)
          .map((i) => ({ productId: i.productId, qty: Number(i.qty) || 0, unitPrice: Number(i.unitPrice) || 0, serialNo: i.serialNo })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(
        saleType === "installment"
          ? `Agreement saved · ${money(monthly)} × ${planMonths - 1} months`
          : "Direct sale invoice saved"
      );
      router.push(`/customers/${res.customerId}`);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))" }}>
        <Card icon={Users} title="Customer">
          <div className="flex gap-[5px] p-1 bg-soft rounded-full">
            {(["new", "existing"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 border-0 cursor-pointer rounded-full px-[10px] py-[9px] text-[12.5px] font-bold"
                style={{ background: mode === m ? "var(--ink)" : "transparent", color: mode === m ? "#fff" : "var(--ink2)" }}
              >
                {m === "new" ? "New customer" : "Repeat purchase"}
              </button>
            ))}
          </div>

          {mode === "existing" ? (
            <>
              <Field label="Search customer">
                <input
                  className={inputCls}
                  placeholder="Name, account or cell"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCustomerId("");
                  }}
                />
              </Field>
              {!customerId && search && (
                <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                  {matches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomerId(c.id);
                        setSearch(c.fullName);
                      }}
                      className="text-left px-3 py-2 rounded-lg hover:bg-soft text-[13px]"
                    >
                      <div className="font-bold">{c.fullName}</div>
                      <div className="text-ink3 text-[11.5px]">
                        Acc {c.accNo} · {c.cell}
                      </div>
                    </button>
                  ))}
                  {matches.length === 0 && <div className="text-[12.5px] text-ink3 px-1">No matches.</div>}
                </div>
              )}
              {selected && (
                <div className="flex flex-col gap-1 p-3 rounded-xl bg-soft text-[13px]">
                  <div className="font-bold">{selected.fullName}</div>
                  <div className="text-ink2">
                    Acc {selected.accNo} · {selected.cell}
                  </div>
                  <div className="text-ink3">{[selected.address, selected.area].filter(Boolean).join(", ") || "No address on file"}</div>
                </div>
              )}
            </>
          ) : (
            <>
              <Field label="Full name">
                <input className={inputCls} placeholder="e.g. Adil Khan" value={newCustomer.fullName} onChange={(e) => setNC("fullName", e.target.value)} />
              </Field>
              <Field label="Cell number">
                <input className={inputCls} placeholder="0311-4544577" value={newCustomer.cell} onChange={(e) => setNC("cell", e.target.value)} />
              </Field>
              <Field label="CNIC">
                <input className={inputCls} placeholder="17301-4455778-1" value={newCustomer.cnic} onChange={(e) => setNC("cnic", e.target.value)} />
              </Field>
              <Field label="Address">
                <input className={inputCls} placeholder="Tehkal Payan, Peshawar" value={newCustomer.address} onChange={(e) => setNC("address", e.target.value)} />
              </Field>
            </>
          )}
        </Card>

        <Card icon={ShieldCheck} title="Guarantor 1">
          <Field label="Name">
            <input
              className={inputCls}
              placeholder="Asad Khan"
              disabled={mode === "existing"}
              value={mode === "existing" ? selected?.g1Name ?? "" : newCustomer.g1Name}
              onChange={(e) => setNC("g1Name", e.target.value)}
            />
          </Field>
          <Field label="Cell / CNIC">
            <input
              className={inputCls}
              placeholder="0312-4440014"
              disabled={mode === "existing"}
              value={mode === "existing" ? selected?.g1Cell ?? "" : newCustomer.g1Cell}
              onChange={(e) => setNC("g1Cell", e.target.value)}
            />
          </Field>
        </Card>

        <Card icon={ShieldCheck} title="Guarantor 2">
          <Field label="Name">
            <input
              className={inputCls}
              placeholder="Wasif Khan"
              disabled={mode === "existing"}
              value={mode === "existing" ? selected?.g2Name ?? "" : newCustomer.g2Name}
              onChange={(e) => setNC("g2Name", e.target.value)}
            />
          </Field>
          <Field label="Cell / CNIC">
            <input
              className={inputCls}
              placeholder="0325-4447852"
              disabled={mode === "existing"}
              value={mode === "existing" ? selected?.g2Cell ?? "" : newCustomer.g2Cell}
              onChange={(e) => setNC("g2Cell", e.target.value)}
            />
          </Field>
        </Card>

        <Card icon={Box} title="Products">
          {items.map((row, i) => (
            <div key={i} className="grid gap-2 items-end" style={{ gridTemplateColumns: "2fr 60px 100px 32px" }}>
              <div className="flex flex-col gap-1">
                {i === 0 && <label className={labelCls}>Item</label>}
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
                <input className={`num ${inputCls}`} inputMode="numeric" value={row.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                {i === 0 && <label className={labelCls}>Price</label>}
                <input className={`num ${inputCls}`} inputMode="numeric" value={row.unitPrice} onChange={(e) => updateItem(i, { unitPrice: e.target.value })} />
              </div>
              <button
                onClick={() => removeItem(i)}
                disabled={items.length === 1}
                className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center disabled:opacity-40"
              >
                <Trash2 size={14} strokeWidth={2.4} />
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="btng self-start border border-line cursor-pointer rounded-full px-[12px] py-[6px] flex items-center gap-[6px] text-[11.5px] font-bold bg-white text-g700"
          >
            <Plus size={13} strokeWidth={2.4} />
            Add item
          </button>
        </Card>

        <Card icon={Receipt} title="Payment terms">
          <div className="flex gap-[5px] p-1 bg-soft rounded-full">
            {([12, 10, 0] as const).map((p) => {
              const active = p === 0 ? saleType === "direct" : saleType === "installment" && planMonths === p;
              return (
                <button
                  key={p}
                  onClick={() => selectPlan(p)}
                  className="flex-1 border-0 cursor-pointer rounded-full px-[10px] py-[9px] text-[12.5px] font-bold"
                  style={{ background: active ? "var(--ink)" : "transparent", color: active ? "#fff" : "var(--ink2)" }}
                >
                  {p ? `${p} month` : "Direct"}
                </button>
              );
            })}
          </div>
          <Field label="Advance received">
            <input className={`num ${inputCls}`} inputMode="numeric" value={advance} onChange={(e) => setAdvance(e.target.value)} />
          </Field>
        </Card>
      </div>

      <div className="p-[19px_22px] rounded-[var(--r-lg)] flex gap-6 flex-wrap items-center" style={{ background: "var(--g900)", color: "#fff" }}>
        {summary.map((s) => (
          <div key={s.label} className="flex flex-col gap-[3px] min-w-[130px]">
            <span className="text-[11px] font-bold tracking-[.06em] uppercase" style={{ color: "rgba(255,255,255,.6)" }}>
              {s.label}
            </span>
            <span className="num text-[24px] font-extrabold tracking-[-.6px]">{s.value}</span>
            <span className="text-[11.5px]" style={{ color: "rgba(255,255,255,.7)" }}>
              {s.note}
            </span>
          </div>
        ))}
        <div className="flex-1" />
        <button
          onClick={submit}
          disabled={pending}
          className="btnp border-0 cursor-pointer rounded-full px-[26px] py-[13px] text-sm font-extrabold bg-g500 text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save agreement"}
        </button>
      </div>
      {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
    </div>
  );
}
