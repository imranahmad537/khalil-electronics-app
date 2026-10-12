"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, PartyPopper, StickyNote, Eraser, X } from "lucide-react";
import { markAllAction, markAttendanceAction, markManyAction } from "@/app/actions/attendance";
import { STATUS_COLOR, STATUS_LABEL, STATUS_SHORT, fmtTime, type AttendanceStatus, type DayState } from "@/lib/attendance";
import { ROLE_LABEL } from "@/lib/roles";
import { initials } from "@/lib/money";
import { showToast } from "@/lib/toast";
import type { RegisterRow } from "@/lib/data/attendance";

// One-tap choices, in the order they're usually needed.
const CHOICES: { s: AttendanceStatus; label: string }[] = [
  { s: "present", label: "Present" },
  { s: "absent", label: "Absent" },
  { s: "leave", label: "Leave" },
  { s: "late", label: "Late" },
  { s: "half_day", label: "Half" },
  { s: "holiday", label: "Holiday" },
];

function Segmented({
  value,
  assumed,
  disabled,
  futureOnly,
  onPick,
}: {
  value: AttendanceStatus | null;
  assumed: boolean;
  disabled: boolean;
  futureOnly: boolean;
  onPick: (s: AttendanceStatus) => void;
}) {
  const choices = futureOnly ? CHOICES.filter((c) => c.s === "leave" || c.s === "holiday") : CHOICES;
  return (
    <div className="inline-flex flex-wrap gap-[3px] p-[3px] rounded-full bg-soft">
      {choices.map(({ s, label }) => {
        const active = value === s;
        const ghost = !value && assumed && s === "present"; // not marked, counted as present
        const c = STATUS_COLOR[s];
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => !active && onPick(s)}
            title={ghost ? "Not marked — counted as present" : STATUS_LABEL[s]}
            className="rounded-full px-[10px] py-[5px] text-[11.5px] font-bold border-0 cursor-pointer disabled:opacity-60 transition-colors"
            style={{
              background: active ? c.fg : ghost ? "#fff" : "transparent",
              color: active ? "#fff" : ghost ? "var(--g500)" : "var(--ink2)",
              boxShadow: ghost ? "inset 0 0 0 1px var(--g100)" : undefined,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  row,
  day,
  canMark,
  isFuture,
  selected,
  onToggle,
}: {
  row: RegisterRow;
  day: string;
  canMark: boolean;
  isFuture: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(row.record?.note ?? "");
  const current = row.record?.status ?? null;

  function save(status: AttendanceStatus | null, noteText?: string) {
    startTransition(async () => {
      const res = await markAttendanceAction(row.employee.id, day, status, noteText);
      if (!res.ok) showToast(res.error);
      setEditingNote(false);
      router.refresh();
    });
  }

  const shown: DayState = row.state;
  const c = STATUS_COLOR[shown];

  return (
    <div
      className="trow grid gap-3 items-center px-2 py-[10px] border-b border-line"
      style={{ gridTemplateColumns: canMark ? "26px minmax(180px,1.2fr) minmax(110px,.7fr) minmax(360px,2fr) 72px" : "minmax(180px,1.2fr) minmax(110px,.7fr) minmax(160px,1fr)", background: selected ? "var(--g50)" : undefined }}
    >
      {canMark && (
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select ${row.employee.fullName}`} className="w-4 h-4 accent-[var(--g600)] cursor-pointer" />
      )}
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[10.5px] font-extrabold">
          {initials(row.employee.fullName)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold truncate">{row.employee.fullName}</span>
          <span className="block text-[11px] text-ink3 truncate">
            {ROLE_LABEL[row.employee.role]}
            {row.record?.note ? ` · ${row.record.note}` : ""}
          </span>
        </span>
      </div>

      <div className="text-[12px] text-ink2">
        {row.record?.checkIn ? (
          <span className="flex flex-col">
            <span className="font-semibold">
              {fmtTime(row.record.checkIn)} – {fmtTime(row.record.checkOut)}
            </span>
            <span className="text-[10.5px] text-ink3">{row.record.source === "self" ? "Checked in" : "By office"}</span>
          </span>
        ) : (
          <span className="rounded-full px-[9px] py-[3px] text-[11px] font-bold" style={{ background: c.bg, color: c.fg }}>
            {shown === "unmarked" ? "Not marked" : STATUS_LABEL[shown]}
          </span>
        )}
      </div>

      {canMark ? (
        editingNote ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && current) save(current, note);
                if (e.key === "Escape") setEditingNote(false);
              }}
              placeholder="e.g. Sick leave, doctor's note received"
              className="flex-1 px-[12px] py-[7px] rounded-xl border border-line bg-soft text-[12.5px] outline-none"
            />
            <button onClick={() => current && save(current, note)} disabled={pending || !current} className="rounded-full px-[12px] py-[6px] text-[11.5px] font-bold bg-g600 text-white disabled:opacity-60">
              Save
            </button>
          </div>
        ) : (
          <Segmented value={current} assumed={shown === "assumed"} disabled={pending} futureOnly={isFuture} onPick={(s) => save(s)} />
        )
      ) : (
        <span className="text-[12px] text-ink3">{current ? STATUS_LABEL[current] : STATUS_LABEL[shown]}</span>
      )}

      {canMark && (
        <div className="flex gap-[5px] justify-end">
          {current && !editingNote && (
            <button
              onClick={() => setEditingNote(true)}
              title="Add a note"
              className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer"
            >
              <StickyNote size={14} strokeWidth={2.4} />
            </button>
          )}
          {current && (
            <button
              onClick={() => save(null)}
              disabled={pending}
              title="Clear (back to not marked)"
              className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer disabled:opacity-60"
            >
              <Eraser size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AttendanceRegister({
  day,
  today,
  rows,
  canMark,
  unmarkedAs,
}: {
  day: string;
  today: string;
  rows: RegisterRow[];
  canMark: boolean;
  unmarkedAs: "present" | "absent";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmHoliday, setConfirmHoliday] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isFuture = day > today;
  const unmarked = rows.filter((r) => !r.record).length;
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function markSelected(status: AttendanceStatus | null) {
    const ids = [...selected];
    startTransition(async () => {
      const res = await markManyAction(ids, day, status);
      showToast(res.ok ? `${ids.length} ${status ? `marked ${STATUS_LABEL[status].toLowerCase()}` : "cleared"}` : res.error);
      if (res.ok) setSelected(new Set());
      router.refresh();
    });
  }

  function bulk(status: "present" | "holiday") {
    startTransition(async () => {
      const res = await markAllAction(day, status);
      showToast(res.ok ? (status === "present" ? `${res.count} marked present` : "Holiday marked for all staff") : res.error);
      setConfirmHoliday(false);
      router.refresh();
    });
  }

  const counts = (["present", "assumed", "late", "half_day", "leave", "absent", "holiday"] as const)
    .map((s) => ({ s, n: rows.filter((r) => r.state === s).length }))
    .filter((c) => c.n > 0);

  return (
    <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Daily register</h2>
        {counts.map((c) => (
          <span key={c.s} className="rounded-full px-[10px] py-[4px] text-[11.5px] font-bold" style={{ background: STATUS_COLOR[c.s].bg, color: STATUS_COLOR[c.s].fg }}>
            {c.s === "assumed" ? "Not marked (present)" : STATUS_LABEL[c.s]} {c.n}
          </span>
        ))}
      </div>

      {canMark && unmarkedAs === "present" && !isFuture && (
        <p className="no-print m-0 text-[12px] text-ink2">
          Everyone counts as <b>present</b> unless you mark otherwise — just record who is absent, on leave, late or on a half day.
        </p>
      )}

      {canMark && (
        <div className="no-print flex items-center gap-2 flex-wrap min-h-[38px]">
          {selected.size > 0 ? (
            <>
              <span className="text-[12.5px] font-bold text-ink">{selected.size} selected — mark as</span>
              {CHOICES.filter((c) => !isFuture || c.s === "leave" || c.s === "holiday").map(({ s, label }) => (
                <button
                  key={s}
                  onClick={() => markSelected(s)}
                  disabled={pending}
                  className="rounded-full px-[12px] py-[6px] text-[12px] font-bold border cursor-pointer disabled:opacity-60"
                  style={{ color: STATUS_COLOR[s].fg, borderColor: "var(--line)", background: "#fff" }}
                >
                  {label}
                </button>
              ))}
              <button onClick={() => markSelected(null)} disabled={pending} className="rounded-full px-[12px] py-[6px] text-[12px] font-bold border border-line bg-white text-ink2 cursor-pointer">
                Clear
              </button>
              <button onClick={() => setSelected(new Set())} title="Cancel selection" className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer">
                <X size={14} strokeWidth={2.4} />
              </button>
            </>
          ) : (
            <>
              {unmarkedAs === "absent" && !isFuture && unmarked > 0 && (
                <button
                  onClick={() => bulk("present")}
                  disabled={pending}
                  className="rounded-full px-[14px] py-[8px] text-[12px] font-bold border border-line bg-white text-g700 flex items-center gap-[6px] cursor-pointer disabled:opacity-60"
                >
                  <CheckCheck size={14} strokeWidth={2.4} />
                  Mark the other {unmarked} present
                </button>
              )}
              {confirmHoliday ? (
                <span className="flex items-center gap-2 text-[12px] font-semibold text-ink2">
                  Holiday for all {rows.length} staff?
                  <button onClick={() => bulk("holiday")} disabled={pending} className="rounded-full px-[12px] py-[6px] font-bold bg-ink text-white disabled:opacity-60">
                    Yes, holiday
                  </button>
                  <button onClick={() => setConfirmHoliday(false)} className="rounded-full px-[12px] py-[6px] font-bold border border-line bg-white">
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmHoliday(true)}
                  disabled={pending}
                  className="rounded-full px-[14px] py-[8px] text-[12px] font-bold border border-line bg-white text-ink2 flex items-center gap-[6px] cursor-pointer disabled:opacity-60"
                >
                  <PartyPopper size={14} strokeWidth={2.4} />
                  Holiday for everyone
                </button>
              )}
              <span className="text-[11.5px] text-ink3 ml-auto">Tip: tick several people to mark them together.</span>
            </>
          )}
        </div>
      )}

      <div className="tblwrap">
        <div className="tblinner" style={{ minWidth: canMark ? 860 : 560 }}>
          {canMark && rows.length > 0 && (
            <label className="no-print flex items-center gap-2 px-2 pb-2 border-b border-line text-[11px] font-bold uppercase tracking-[.06em] text-ink3 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.employee.id)))}
                className="w-4 h-4 accent-[var(--g600)]"
              />
              Select all
            </label>
          )}
          {rows.map((row) => (
            <Row
              key={`${row.employee.id}|${row.record?.note ?? ""}`}
              row={row}
              day={day}
              canMark={canMark}
              isFuture={isFuture}
              selected={selected.has(row.employee.id)}
              onToggle={() => toggle(row.employee.id)}
            />
          ))}
          {rows.length === 0 && <div className="p-7 text-center text-[13px] text-ink2">No active staff on this date. Add staff in Employees.</div>}
        </div>
      </div>
      <p className="m-0 pb-2 text-[11px] text-ink3">
        {STATUS_SHORT.present} present · {STATUS_SHORT.late} late · {STATUS_SHORT.half_day} half day · {STATUS_SHORT.leave} leave · {STATUS_SHORT.absent} absent ·{" "}
        {STATUS_SHORT.holiday} holiday — the same codes as the monthly sheet.
      </p>
    </div>
  );
}
