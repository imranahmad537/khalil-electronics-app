"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, UserCheck } from "lucide-react";
import { bulkAssignAvoAction } from "@/app/actions/recovery";
import { showToast } from "@/lib/toast";
import type { AssignableCustomer } from "@/lib/data/recovery";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [avoId, setAvoId] = useState(defaultAvoId ?? officers[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => (c.fullName + " " + c.accNo).toLowerCase().includes(q));
  }, [search, customers]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await bulkAssignAvoAction({ customerIds: [...selected], avoId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast(`${res.count} account${res.count === 1 ? "" : "s"} assigned`);
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[460px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-start justify-between">
              <h2 className="text-[16.5px] font-extrabold m-0">Assign customers</h2>
              <button
                onClick={() => setOpen(false)}
                className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <input
              placeholder="Search customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
            />

            <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-[180px]">
              {filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-[10px] px-2 py-[7px] rounded-lg hover:bg-soft text-[13px] cursor-pointer">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <span className="flex-1">{c.fullName}</span>
                  <span className="text-ink3 text-[11.5px]">{c.avoName}</span>
                </label>
              ))}
              {filtered.length === 0 && <div className="text-[12.5px] text-ink3 px-2">No matches.</div>}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={avoId}
                onChange={(e) => setAvoId(e.target.value)}
                className="flex-1 px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none"
              >
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <span className="text-[11.5px] text-ink3 whitespace-nowrap">{selected.size} selected</span>
            </div>

            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

            <button
              onClick={submit}
              disabled={pending || selected.size === 0 || !avoId}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] flex items-center justify-center gap-2 text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              <UserCheck size={16} strokeWidth={2.4} />
              {pending ? "Assigning…" : "Assign"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
