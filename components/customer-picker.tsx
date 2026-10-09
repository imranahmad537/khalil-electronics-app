"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";
import { MaskedInput } from "@/components/masked-input";
import { StatusChip } from "@/components/status-chip";
import { money, initials } from "@/lib/money";
import { maskCnic, maskCell, type AgreementFormValues } from "@/lib/agreement-schema";
import { matchAvoByArea } from "@/lib/avo-matching";
import type { ExistingCustomerOption, OfficerOption } from "@/lib/data/agreement-form";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none disabled:opacity-60";
const labelCls = "text-[11.5px] font-bold text-ink2";

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`flex flex-col gap-[5px] ${span2 ? "span-2" : ""}`}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function CustomerPicker({
  customers,
  officers,
  areas,
}: {
  customers: ExistingCustomerOption[];
  officers: OfficerOption[];
  areas: string[];
}) {
  const { control, watch, setValue, formState } = useFormContext<AgreementFormValues>();
  const mode = watch("mode");
  const customerId = watch("customerId");
  const cnic = watch("cnic");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const errors = formState.errors;
  const selected = customers.find((c) => c.id === customerId) ?? null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const matches = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => (c.fullName + " " + c.accNo + " " + (c.cnic ?? "") + " " + c.cell).toLowerCase().includes(q))
      .slice(0, 6);
  }, [debouncedSearch, customers]);

  const dedupeMatch = useMemo(() => {
    if (!cnic || cnic.length < 13) return null;
    return customers.find((c) => c.cnic === cnic) ?? null;
  }, [cnic, customers]);

  function selectMode(m: "new" | "existing") {
    setValue("mode", m);
    setValue("customerId", null);
    setSearch("");
  }

  function pickCustomer(c: ExistingCustomerOption) {
    setValue("customerId", c.id);
    setSearch(c.fullName);
    setValue("useExistingGuarantors", !!(c.g1Name || c.g2Name));
  }

  function onAreaChange(value: string) {
    setValue("area", value);
    const match = matchAvoByArea(value, officers);
    if (match) setValue("avoId", match.id);
  }

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-4">
      <div className="flex gap-[5px] p-1 bg-soft rounded-full">
        {(["new", "existing"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectMode(m)}
            className="flex-1 border-0 cursor-pointer rounded-full px-[10px] py-[10px] text-[12.5px] font-bold"
            style={{ background: mode === m ? "var(--ink)" : "transparent", color: mode === m ? "#fff" : "var(--ink2)" }}
          >
            {m === "new" ? "New customer" : "Existing customer"}
          </button>
        ))}
      </div>

      {mode === "new" ? (
        <div className="form-grid-2">
          <Field label="Full name *">
            <Controller
              name="fullName"
              control={control}
              render={({ field }) => (
                <input {...field} placeholder="e.g. Adil Khan" className={inputCls} style={errors.fullName ? { borderColor: "var(--red)" } : undefined} />
              )}
            />
            {errors.fullName && <span className="text-[11px] font-semibold text-red">{errors.fullName.message}</span>}
          </Field>
          <Field label="Father name">
            <Controller name="fatherName" control={control} render={({ field }) => <input {...field} className={inputCls} />} />
          </Field>

          <Field label="CNIC *">
            <Controller
              name="cnic"
              control={control}
              render={({ field }) => (
                <MaskedInput value={field.value} onChange={field.onChange} mask={maskCnic} placeholder="00000-0000000-0" error={errors.cnic?.message} />
              )}
            />
            {dedupeMatch && (
              <span className="text-[11.5px] font-semibold text-amber flex items-center gap-1">
                <AlertTriangle size={12} strokeWidth={2.6} />
                Already a customer — Acc {dedupeMatch.accNo} ·{" "}
                <button type="button" onClick={() => { selectMode("existing"); pickCustomer(dedupeMatch); }} className="underline">
                  switch to existing
                </button>
              </span>
            )}
          </Field>
          <Field label="Cell *">
            <Controller
              name="cell"
              control={control}
              render={({ field }) => (
                <MaskedInput value={field.value} onChange={field.onChange} mask={maskCell} placeholder="03XX-XXXXXXX" error={errors.cell?.message} />
              )}
            />
          </Field>

          <Field label="Alternate cell">
            <Controller
              name="cell2"
              control={control}
              render={({ field }) => <MaskedInput value={field.value} onChange={field.onChange} mask={maskCell} placeholder="03XX-XXXXXXX" />}
            />
          </Field>
          <Field label="Area">
            <Controller
              name="area"
              control={control}
              render={({ field }) => (
                <>
                  <input {...field} list="areas-list" onChange={(e) => onAreaChange(e.target.value)} placeholder="Tehkal Payan" className={inputCls} />
                  <datalist id="areas-list">
                    {areas.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </>
              )}
            />
          </Field>

          <Field label="Full address *" span2>
            <Controller
              name="address"
              control={control}
              render={({ field }) => <input {...field} placeholder="House / street, Peshawar" className={inputCls} style={errors.address ? { borderColor: "var(--red)" } : undefined} />}
            />
            {errors.address && <span className="text-[11px] font-semibold text-red">{errors.address.message}</span>}
          </Field>

          <Field label="Occupation">
            <Controller name="occupation" control={control} render={({ field }) => <input {...field} className={inputCls} />} />
          </Field>
          <Field label="Assigned AVO">
            <Controller
              name="avoId"
              control={control}
              render={({ field }) => (
                <select {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} className={inputCls}>
                  <option value="">Auto-assign from area</option>
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.fullName}
                    </option>
                  ))}
                </select>
              )}
            />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-[9px] px-[14px] py-[10px] rounded-xl bg-soft">
            <Search size={15} strokeWidth={2.4} className="text-ink3" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setValue("customerId", null);
              }}
              placeholder="Name, account, CNIC or cell…"
              className="flex-1 min-w-0 border-0 bg-transparent text-[13.5px] text-ink outline-none"
            />
          </div>
          {errors.customerId && !customerId && <span className="text-[11px] font-semibold text-red">{errors.customerId.message}</span>}

          {!customerId && search && (
            <div className="flex flex-col gap-1">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCustomer(c)}
                  className="flex items-center gap-3 text-left px-3 py-2 rounded-xl hover:bg-soft"
                >
                  <span className="w-9 h-9 flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[11px] font-extrabold">
                    {initials(c.fullName)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-bold truncate">{c.fullName}</span>
                    <span className="block text-[11.5px] text-ink3 truncate">
                      Acc {c.accNo} · {c.cell} · {c.area ?? "—"}
                    </span>
                  </span>
                  <StatusChip status={c.status} />
                </button>
              ))}
              {matches.length === 0 && <div className="text-[12.5px] text-ink3 px-1 py-2">No matches.</div>}
            </div>
          )}

          {selected && (
            <div className="flex flex-col gap-3 p-4 rounded-xl bg-g50">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[13.5px] font-bold">{selected.fullName}</div>
                  <div className="text-[11.5px] text-ink2">
                    Acc {selected.accNo} · {selected.cell} · {selected.area ?? "—"}
                  </div>
                </div>
                <Link href={`/customers/${selected.id}`} target="_blank" className="text-[11.5px] font-bold text-g700 underline">
                  View ledger
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[12px]">
                <div>
                  <div className="text-ink3 font-bold">Open agreements</div>
                  <div className="num font-extrabold">{selected.openAgreementsCount}</div>
                </div>
                <div>
                  <div className="text-ink3 font-bold">Monthly due</div>
                  <div className="num font-extrabold">{money(selected.monthlyDue)}</div>
                </div>
                <div>
                  <div className="text-ink3 font-bold">Remaining</div>
                  <div className="num font-extrabold">{money(selected.remaining)}</div>
                </div>
              </div>
              {(selected.status === "overdue" || selected.status === "default") && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber50 text-[12px] font-semibold" style={{ color: "#8a5a10" }}>
                  <AlertTriangle size={14} strokeWidth={2.4} />
                  {selected.status === "default"
                    ? "2+ months behind — manager approval needed"
                    : "This account is currently overdue"}
                </div>
              )}
              {(selected.g1Name || selected.g2Name) && (
                <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink2">
                  <Controller
                    name="useExistingGuarantors"
                    control={control}
                    render={({ field }) => (
                      <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                    )}
                  />
                  Use previous guarantors ({selected.g1Name ?? "—"} / {selected.g2Name ?? "—"})
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
