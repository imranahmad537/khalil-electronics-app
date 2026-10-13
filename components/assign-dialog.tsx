"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, UserCheck, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { bulkAssignAvoAction } from "@/app/actions/recovery";
import { showToast } from "@/lib/toast";
import type { AssignableCustomer } from "@/lib/data/recovery";

type Filter = "available" | "unassigned" | "inactive" | "others" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "available", label: "Needs an officer" },
  { key: "others", label: "With other officers" },
  { key: "all", label: "All" },
];

/**
 * A customer has exactly ONE field officer. Assigning someone who already
 * belongs to another active officer is a transfer — shown separately and
 * confirmed before it happens. Customers already with the chosen officer
 * can't be selected.
 */
export function AssignDialog({
  trigger,
  customers,
  officers,
  defaultAvoId,
}: {
  trigger: React.ReactNode;
  customers: AssignableCustomer[];
  officers: { id: string; name: string }[];
  defaultAvoId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("available");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [avoId, setAvoId] = useState(defaultAvoId ?? officers[0]?.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const target = officers.find((o) => o.id === avoId);
  const needsOfficer = (c: AssignableCustomer) => !c.avoId || !c.avoActive;
  const isTransfer = (c: AssignableCustomer) => !!c.avoId && c.avoActive && c.avoId !== avoId;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) =>
        filter === "available" ? needsOfficer(c) : filter === "others" ? isTransfer(c) : filter === "unassigned" ? !c.avoId : filter === "inactive" ? !!c.avoId && !c.avoActive : true
      )
      .filter((c) => !q || `${c.fullName} ${c.accNo} ${c.area ?? ""} ${c.avoName}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter, customers, avoId]);

  const chosen = customers.filter((c) => selected.has(c.id));
  const transfers = chosen.filter(isTransfer);
  const fromNames = [...new Set(transfers.map((c) => c.avoName))];
  const counts = {
    available: customers.filter(needsOfficer).length,
    others: customers.filter(isTransfer).length,
    all: customers.length,
  };

  function reset() {
    setSelected(new Set());
    setConfirming(false);
    setReason("");
    setError("");
  }

  function toggle(id: string) {
    setConfirming(false);
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectableInView() {
    return filtered.filter((c) => c.avoId !== avoId);
  }

  function submit(transfer: boolean) {
    setError("");
    if (transfers.length > 0 && !transfer) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const res = await bulkAssignAvoAction({ customerIds: [...selected], avoId, transfer, reason });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const parts = [
        res.assigned ? `${res.assigned} assigned` : "",
        res.transferred ? `${res.transferred} transferred` : "",
        res.unchanged ? `${res.unchanged} already with ${target?.name}` : "",
      ].filter(Boolean);
      showToast(`${parts.join(" · ")} — ${target?.name}`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <span
        onClick={() => {
          reset();
          setFilter("available");
          setAvoId(defaultAvoId ?? officers[0]?.id ?? "");
          setOpen(true);
        }}
      >
        {trigger}
      </span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[520px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-3 max-h-[88vh]">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[16.5px] font-extrabold m-0">Assign customers</h2>
                <p className="m-0 mt-1 text-[12px] text-ink3">Each customer has one field officer. Moving someone from another officer is a transfer.</p>
              </div>
              <button onClick={() => setOpen(false)} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-ink2 whitespace-nowrap">Assign to</span>
              <select
                value={avoId}
                onChange={(e) => {
                  setAvoId(e.target.value);
                  reset();
                }}
                className="flex-1 px-[14px] py-[9px] rounded-xl border border-line bg-soft text-[13.5px] font-semibold text-ink outline-none"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1 p-1 bg-soft rounded-full">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className="flex-1 border-0 cursor-pointer rounded-full px-2 py-[7px] text-[11.5px] font-bold"
                  style={{ background: filter === f.key ? "var(--ink)" : "transparent", color: filter === f.key ? "#fff" : "var(--ink2)" }}
                >
                  {f.label} ({counts[f.key as keyof typeof counts]})
                </button>
              ))}
            </div>

            <input
              placeholder="Search name, account, area or officer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
            />

            <div className="flex items-center justify-between text-[11.5px] text-ink3 px-1">
              <button
                onClick={() => {
                  setConfirming(false);
                  setSelected(new Set([...selected, ...selectableInView().map((c) => c.id)]));
                }}
                className="border-0 bg-transparent p-0 cursor-pointer font-bold text-g700"
                disabled={selectableInView().length === 0}
              >
                Select all {selectableInView().length} shown
              </button>
              {selected.size > 0 && (
                <button onClick={reset} className="border-0 bg-transparent p-0 cursor-pointer font-bold text-ink2">
                  Clear selection
                </button>
              )}
            </div>

            <div className="flex flex-col gap-[2px] overflow-y-auto flex-1 min-h-[180px]">
              {filtered.map((c) => {
                const already = c.avoId === avoId;
                const transfer = isTransfer(c);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-[10px] px-2 py-[7px] rounded-lg text-[13px] ${already ? "opacity-50 cursor-not-allowed" : "hover:bg-soft cursor-pointer"}`}
                  >
                    <input type="checkbox" checked={selected.has(c.id)} disabled={already} onChange={() => toggle(c.id)} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{c.fullName}</span>
                      <span className="block text-[11px] text-ink3 truncate">
                        Acc {c.accNo}
                        {c.area ? ` · ${c.area}` : ""}
                      </span>
                    </span>
                    <span
                      className="text-[11px] font-bold rounded-full px-[9px] py-[3px] whitespace-nowrap"
                      style={
                        already
                          ? { background: "var(--g50)", color: "var(--g700)" }
                          : !c.avoId
                            ? { background: "var(--soft)", color: "var(--ink2)" }
                            : !c.avoActive
                              ? { background: "var(--red50)", color: "var(--red)" }
                              : transfer
                                ? { background: "var(--amber50)", color: "#8a5a10" }
                                : undefined
                      }
                    >
                      {already ? "Already theirs" : !c.avoId ? "Unassigned" : !c.avoActive ? `${c.avoName} (inactive)` : c.avoName}
                    </span>
                  </label>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-[12.5px] text-ink3 px-2 py-3">
                  {filter === "available" ? "Every customer has an active officer." : "No matches."}
                </div>
              )}
            </div>

            {confirming && transfers.length > 0 && (
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber50 text-[12.5px]" style={{ color: "#8a5a10" }}>
                <span className="flex items-start gap-2 font-semibold">
                  <AlertTriangle size={15} strokeWidth={2.4} className="flex-none mt-[1px]" />
                  {transfers.length} of these customer{transfers.length === 1 ? "" : "s"} belong to {fromNames.join(", ")}. They&apos;ll move to {target?.name}.
                </span>
                <span className="text-[11.5px] leading-[1.45]">
                  Their pending house visits move too. Money already collected stays credited to the old officer, who can still sync offline collections for
                  3 days.
                </span>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional) — e.g. area change, officer on leave"
                  className="px-[12px] py-[8px] rounded-lg border border-line bg-white text-[12.5px] text-ink outline-none"
                />
              </div>
            )}

            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

            {confirming ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 border border-line cursor-pointer rounded-full px-5 py-[12px] text-[13px] font-bold bg-white text-ink2"
                >
                  Back
                </button>
                <button
                  onClick={() => submit(true)}
                  disabled={pending}
                  className="flex-[2] border-0 cursor-pointer rounded-full px-5 py-[12px] flex items-center justify-center gap-2 text-[13px] font-bold bg-amber text-white disabled:opacity-60"
                >
                  <ArrowRightLeft size={15} strokeWidth={2.4} />
                  {pending ? "Transferring…" : `Confirm transfer to ${target?.name}`}
                </button>
              </div>
            ) : (
              <button
                onClick={() => submit(false)}
                disabled={pending || selected.size === 0 || !avoId}
                className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] flex items-center justify-center gap-2 text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
              >
                <UserCheck size={16} strokeWidth={2.4} />
                {pending
                  ? "Assigning…"
                  : selected.size === 0
                    ? "Select customers"
                    : transfers.length > 0
                      ? `Assign ${selected.size} (${transfers.length} transfer${transfers.length === 1 ? "" : "s"}) — review`
                      : `Assign ${selected.size} to ${target?.name}`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
