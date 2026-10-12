"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { markAttendanceAction } from "@/app/actions/attendance";
import { STATUS_COLOR, STATUS_LABEL, STATUS_SHORT, WEEKDAYS, weekdayOf, type AttendanceStatus } from "@/lib/attendance";
import { ROLE_LABEL } from "@/lib/roles";
import { showToast } from "@/lib/toast";
import type { MonthlyRow } from "@/lib/data/attendance";

const MENU: { s: AttendanceStatus; label: string }[] = [
  { s: "present", label: "Present" },
  { s: "absent", label: "Absent" },
  { s: "leave", label: "Leave" },
  { s: "late", label: "Late" },
  { s: "half_day", label: "Half day" },
  { s: "holiday", label: "Holiday" },
];

/**
 * The monthly attendance sheet. For owner/manager every day cell is a
 * button: tap it to set that day — like filling in a paper register.
 */
export function AttendanceSheet({
  month,
  days,
  today,
  rows,
  canMark,
}: {
  month: string;
  days: string[];
  today: string;
  rows: MonthlyRow[];
  canMark: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<string | null>(null); // "employeeId|day"
  // the sheet scrolls sideways inside a clipping box, so the menu is placed on screen coordinates
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const dismiss = () => setOpen(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);

  function set(employeeId: string, day: string, status: AttendanceStatus | null) {
    setOpen(null);
    startTransition(async () => {
      const res = await markAttendanceAction(employeeId, day, status);
      if (!res.ok) showToast(res.error);
      router.refresh();
    });
  }

  const cols = `minmax(170px,1.6fr) repeat(${days.length}, 26px) repeat(6, 44px) 56px`;

  return (
    <div className="tblwrap">
      <div className="tblinner" style={{ minWidth: 170 + days.length * 30 + 6 * 48 + 60, opacity: pending ? 0.7 : 1 }}>
        <div className="grid gap-[4px] items-end pb-2 border-b border-line text-[10px] font-bold text-ink3" style={{ gridTemplateColumns: cols }}>
          <span className="uppercase tracking-[.08em]">Employee</span>
          {days.map((d) => (
            <span key={d} className="text-center leading-tight" style={{ color: d === today ? "var(--g700)" : undefined }}>
              {WEEKDAYS[weekdayOf(d)][0]}
              <br />
              {Number(d.slice(8))}
            </span>
          ))}
          {["P", "L", "H", "LV", "A", "HO"].map((h) => (
            <span key={h} className="text-center">
              {h}
            </span>
          ))}
          <span className="text-right">%</span>
        </div>

        {rows.map((r) => (
          <div key={r.employee.id} className="trow grid gap-[4px] items-center py-[7px] border-b border-line" style={{ gridTemplateColumns: cols }}>
            <Link href={`/attendance?view=monthly&month=${month}&employee=${r.employee.id}`} className="min-w-0 text-ink" title="Open day-by-day record">
              <span className="block text-[12.5px] font-bold truncate">{r.employee.fullName}</span>
              <span className="block text-[10.5px] text-ink3">{ROLE_LABEL[r.employee.role]}</span>
            </Link>

            {r.days.map((d) => {
              const key = `${r.employee.id}|${d.day}`;
              const c = STATUS_COLOR[d.state];
              const editable = canMark && d.state !== "not_joined" && d.state !== "left";
              const future = d.day > today;
              const title = `${d.day} · ${STATUS_LABEL[d.state]}${d.record?.note ? " · " + d.record.note : ""}${editable ? " — tap to change" : ""}`;
              const cell = (
                <span
                  className="h-[22px] w-full rounded-[5px] flex items-center justify-center text-[9.5px] font-bold"
                  style={{ background: c.bg, color: c.fg, outline: open === key ? "2px solid var(--g500)" : undefined }}
                >
                  {STATUS_SHORT[d.state]}
                </span>
              );
              if (!editable) {
                return (
                  <span key={d.day} title={title}>
                    {cell}
                  </span>
                );
              }
              return (
                <span key={d.day}>
                  <button
                    type="button"
                    title={title}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const menuH = 250;
                      const below = rect.bottom + 4 + menuH < window.innerHeight;
                      setAnchor({ x: Math.min(window.innerWidth - 140, Math.max(8, rect.left + rect.width / 2 - 66)), y: below ? rect.bottom + 4 : rect.top - 4 - menuH });
                      setOpen(open === key ? null : key);
                    }}
                    className="w-full p-0 border-0 bg-transparent cursor-pointer"
                  >
                    {cell}
                  </button>
                  {open === key && anchor && (
                    <div
                      ref={menuRef}
                      style={{ position: "fixed", left: anchor.x, top: anchor.y }}
                      className="no-print z-50 w-[132px] p-1 rounded-xl bg-panel shadow-[0_8px_24px_rgba(16,24,40,.16)] border border-line flex flex-col"
                    >
                      <span className="px-2 py-1 text-[10.5px] font-bold text-ink3">
                        {Number(d.day.slice(8))} {WEEKDAYS[weekdayOf(d.day)].slice(0, 3)}
                      </span>
                      {MENU.filter((m) => !future || m.s === "leave" || m.s === "holiday").map((m) => (
                        <button
                          key={m.s}
                          type="button"
                          onClick={() => set(r.employee.id, d.day, m.s)}
                          className="text-left px-2 py-[6px] rounded-lg text-[12px] font-bold border-0 bg-transparent cursor-pointer hover:bg-soft flex items-center gap-2"
                          style={{ color: STATUS_COLOR[m.s].fg }}
                        >
                          <span className="w-[22px] text-center rounded-[4px] text-[9.5px]" style={{ background: STATUS_COLOR[m.s].bg }}>
                            {STATUS_SHORT[m.s]}
                          </span>
                          {m.label}
                        </button>
                      ))}
                      {d.record && (
                        <button
                          type="button"
                          onClick={() => set(r.employee.id, d.day, null)}
                          className="text-left px-2 py-[6px] rounded-lg text-[12px] font-bold border-0 bg-transparent cursor-pointer hover:bg-soft text-ink2"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </span>
              );
            })}

            {[r.summary.present, r.summary.late, r.summary.halfDay, r.summary.leave, r.summary.absent, r.summary.holiday].map((n, i) => (
              <span key={i} className="num text-center text-[12px] font-bold" style={{ color: i === 4 && n > 0 ? "var(--red)" : undefined }}>
                {n}
              </span>
            ))}
            <span className="num text-right text-[12.5px] font-extrabold">{r.summary.attendancePct === null ? "—" : `${r.summary.attendancePct}%`}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="p-7 text-center text-[13px] text-ink2">No active staff. Add staff in Employees.</div>}
      </div>
    </div>
  );
}
