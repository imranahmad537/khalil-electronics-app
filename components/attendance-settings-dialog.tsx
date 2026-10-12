"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2, X } from "lucide-react";
import { updateAttendanceSettingsAction } from "@/app/actions/attendance";
import { WEEKDAYS, fmtShift, type AttendanceSettings } from "@/lib/attendance";
import { enterToNextField } from "@/lib/enter-to-next";
import { showToast } from "@/lib/toast";

const inputCls = "px-[15px] py-[10px] rounded-xl border border-line bg-soft text-[13.5px] text-ink outline-none";
const labelCls = "text-[11.5px] font-bold text-ink2";

export function AttendanceSettingsDialog({ settings }: { settings: AttendanceSettings }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(settings);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await updateAttendanceSettingsAction(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      showToast("Attendance settings saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => {
          setForm(settings);
          setError("");
          setOpen(true);
        }}
        className="no-print border border-line cursor-pointer rounded-full px-[16px] py-[10px] flex items-center gap-2 text-[12.5px] font-bold bg-white text-ink2"
        title={`Shift ${fmtShift(settings.shiftStart)} · ${settings.graceMinutes} min grace · off ${settings.weeklyOff >= 0 ? WEEKDAYS[settings.weeklyOff] : "none"}`}
      >
        <Settings2 size={15} strokeWidth={2.4} />
        Shift settings
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-[420px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4" onKeyDown={enterToNextField}>
            <div className="flex items-start justify-between">
              <h2 className="text-[16.5px] font-extrabold m-0">Shift settings</h2>
              <button onClick={() => setOpen(false)} className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Shift starts</label>
                <input type="time" className={inputCls} value={form.shiftStart} onChange={(e) => setForm((f) => ({ ...f, shiftStart: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Grace (minutes)</label>
                <input
                  className={`num ${inputCls}`}
                  inputMode="numeric"
                  value={form.graceMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, graceMinutes: Number(e.target.value.replace(/\D/g, "")) || 0 }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Half day if under (hours)</label>
                <input
                  className={`num ${inputCls}`}
                  inputMode="decimal"
                  value={form.halfDayHours}
                  onChange={(e) => setForm((f) => ({ ...f, halfDayHours: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Weekly off</label>
                <select className={inputCls} value={form.weeklyOff} onChange={(e) => setForm((f) => ({ ...f, weeklyOff: Number(e.target.value) }))}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                  <option value={-1}>No weekly off</option>
                </select>
              </div>
            </div>
            <p className="m-0 text-[12px] text-ink2 leading-[1.5]">
              Checking in after {fmtShift(form.shiftStart)} + {form.graceMinutes} min counts as <b>Late</b>. Checking out after less than {form.halfDayHours} hours
              counts as a <b>Half day</b>. The weekly off day is never counted as absent.
            </p>
            {error && <div className="text-[12px] font-semibold text-red">{error}</div>}
            <button
              onClick={submit}
              disabled={pending}
              className="btnp border-0 cursor-pointer rounded-full px-5 py-[13px] text-[13.5px] font-bold bg-g500 text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
