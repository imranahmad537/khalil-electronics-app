"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, PartyPopper, StickyNote, Eraser } from "lucide-react";
import { markAllAction, markAttendanceAction } from "@/app/actions/attendance";
import { MARKABLE, STATUS_COLOR, STATUS_LABEL, STATUS_SHORT, fmtTime, type AttendanceStatus } from "@/lib/attendance";
import { ROLE_LABEL } from "@/lib/roles";
import { initials } from "@/lib/money";
import { showToast } from "@/lib/toast";
import type { RegisterRow } from "@/lib/data/attendance";

function Row({ row, day, canMark, isFuture }: { row: RegisterRow; day: string; canMark: boolean; isFuture: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState(row.record?.note ?? "");
  const current = row.record?.status ?? null;
  const choices = isFuture ? MARKABLE.filter((s) => s === "leave" || s === "holiday") : MARKABLE;

  function save(status: AttendanceStatus | null, noteText?: string) {
    startTransition(async () => {
      const res = await markAttendanceAction(row.employee.id, day, status, noteText);
      if (!res.ok) showToast(res.error);
      setEditingNote(false);
      router.refresh();
    });
  }

  const stateColor = STATUS_COLOR[row.state];

  return (
    <div className="trow grid gap-3 items-center px-1 py-3 border-b border-line" style={{ gridTemplateColumns: "minmax(190px,1.3fr) minmax(130px,.8fr) minmax(330px,2fr) minmax(120px,.8fr)" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[11px] font-extrabold">
          {initials(row.employee.fullName)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold truncate">{row.employee.fullName}</span>
          <span className="block text-[11.5px] text-ink3">
            {ROLE_LABEL[row.employee.role]}
            {!row.employee.hasLogin && " · no login"}
          </span>
        </span>
      </div>

      <div className="text-[12px] text-ink2 flex flex-col">
        {row.record?.checkIn ? (
          <>
            <span className="font-semibold">
              {fmtTime(row.record.checkIn)} – {fmtTime(row.record.checkOut)}
            </span>
            <span className="text-[11px] text-ink3">{row.record.source === "self" ? "Self check-in" : "Marked by office"}</span>
          </>
        ) : (
          <span
            className="self-start rounded-full px-[10px] py-[4px] text-[11.5px] font-bold"
            style={{ background: stateColor.bg, color: stateColor.fg }}
          >
            {row.state === "unmarked" ? "Not marked yet" : STATUS_LABEL[row.state]}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {canMark ? (
          <div className="flex gap-[5px] flex-wrap">
            {choices.map((s) => {
              const active = current === s;
              const c = STATUS_COLOR[s];
              return (
                <button
                  key={s}
                  onClick={() => !active && save(s)}
                  disabled={pending}
                  title={STATUS_LABEL[s]}
                  className="rounded-full px-[11px] py-[6px] text-[11.5px] font-bold border cursor-pointer disabled:opacity-60"
                  style={{
                    background: active ? c.fg : "#fff",
                    color: active ? "#fff" : c.fg,
                    borderColor: active ? c.fg : "var(--line)",
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-[12px] text-ink3">View only</span>
        )}
        {editingNote ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && current && save(current, note)}
              placeholder="e.g. Sick leave, doctor's note received"
              className="flex-1 px-[12px] py-[7px] rounded-xl border border-line bg-soft text-[12.5px] outline-none"
            />
            <button
              onClick={() => current && save(current, note)}
              disabled={pending || !current}
              className="rounded-full px-[12px] py-[6px] text-[11.5px] font-bold bg-g600 text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
        ) : (
          row.record?.note && <span className="text-[11.5px] text-ink2">Note: {row.record.note}</span>
        )}
      </div>

      <div className="flex gap-[6px] justify-end">
        {canMark && current && !editingNote && (
          <button
            onClick={() => setEditingNote(true)}
            title="Add or edit note"
            className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer"
          >
            <StickyNote size={14} strokeWidth={2.4} />
          </button>
        )}
        {canMark && current && (
          <button
            onClick={() => save(null)}
            disabled={pending}
            title="Clear this day"
            className="w-8 h-8 rounded-full border border-line bg-white text-ink2 flex items-center justify-center cursor-pointer disabled:opacity-60"
          >
            <Eraser size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>
    </div>
  );
}

export function AttendanceRegister({
  day,
  today,
  rows,
  canMark,
}: {
  day: string;
  today: string;
  rows: RegisterRow[];
  canMark: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmHoliday, setConfirmHoliday] = useState(false);
  const isFuture = day > today;
  const unmarked = rows.filter((r) => !r.record).length;

  function bulk(status: "present" | "holiday") {
    startTransition(async () => {
      const res = await markAllAction(day, status);
      showToast(res.ok ? (status === "present" ? `${res.count} marked present` : "Holiday marked for all staff") : res.error);
      setConfirmHoliday(false);
      router.refresh();
    });
  }

  const counts = (["present", "late", "half_day", "leave", "absent", "holiday"] as const).map((s) => ({
    s,
    n: rows.filter((r) => r.state === s).length,
  }));

  return (
    <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Daily register</h2>
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <span key={c.s} className="rounded-full px-[10px] py-[4px] text-[11.5px] font-bold" style={{ background: STATUS_COLOR[c.s].bg, color: STATUS_COLOR[c.s].fg }}>
              {STATUS_SHORT[c.s]} {c.n}
            </span>
          ))}
        {unmarked > 0 && (
          <span className="rounded-full px-[10px] py-[4px] text-[11.5px] font-bold bg-soft text-ink2">{unmarked} not marked</span>
        )}
      </div>

      {canMark && (
        <div className="no-print flex gap-2 flex-wrap">
          {!isFuture && unmarked > 0 && (
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
              Mark this day a holiday for all {rows.length} staff?
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
        </div>
      )}

      <div className="tblwrap">
        <div className="tblinner" style={{ minWidth: 860 }}>
          {rows.map((row) => (
            <Row key={`${row.employee.id}|${row.record?.note ?? ""}`} row={row} day={day} canMark={canMark} isFuture={isFuture} />
          ))}
          {rows.length === 0 && <div className="p-7 text-center text-[13px] text-ink2">No active staff on this date. Add staff in Employees.</div>}
        </div>
      </div>
    </div>
  );
}
