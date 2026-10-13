"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogIn, MapPin, X } from "lucide-react";
import { checkInAction } from "@/app/actions/attendance";
import { getPositionSafe } from "@/lib/offline-queue";
import { fmtShift } from "@/lib/attendance";
import { showToast } from "@/lib/toast";
import type { MyAttendanceToday } from "@/lib/data/attendance";

/** localStorage key for "Later" — cleared on every successful login (login page). */
export const CHECKIN_DISMISS_PREFIX = "ke-checkin-later:";

/** Minutes since midnight in the shop's timezone. */
function shopMinutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/**
 * Asks for check-in right after login. Shown only to staff linked to an
 * employee record, on a working day, when today has no check-in and the
 * office hasn't marked the day (leave / holiday / absent). "Later" hides it
 * for the rest of this login on every tab; it returns at the next login.
 */
export function CheckInPrompt({ data, variant }: { data: MyAttendanceToday; variant: "office" | "field" }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const key = data.linked ? `${CHECKIN_DISMISS_PREFIX}${data.employeeId}:${data.today}` : "";
  const eligible = data.linked && !data.isOffDay && !data.record; // any record (check-in or an office mark) means nothing to ask

  useEffect(() => {
    if (!eligible) {
      setShow(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(key) === "1";
    } catch {
      dismissed = false;
    }
    setShow(!dismissed);
    // another tab pressed "Later"
    const onStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue === "1") setShow(false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [eligible, key]);

  if (!show || !data.linked) return null;

  const [sh, sm] = data.shiftStart.split(":").map(Number);
  const lateBy = shopMinutesNow() - (sh * 60 + sm + data.graceMinutes);

  function later() {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* private mode — it just shows again on the next page load */
    }
    setShow(false);
  }

  function checkIn() {
    setError("");
    startTransition(async () => {
      const pos = variant === "field" ? await getPositionSafe() : null;
      let res: Awaited<ReturnType<typeof checkInAction>>;
      try {
        res = await checkInAction(pos?.lat ?? null, pos?.lng ?? null);
      } catch {
        setError("No connection — check your internet and try again.");
        return;
      }
      if (!res.ok && !/already checked in/i.test(res.error)) {
        setError(res.error);
        return;
      }
      // checked in now, or already done from another tab/device — either way we're done
      showToast(res.ok ? (res.status === "late" ? "Checked in — marked late" : "Checked in — have a good day") : "You're already checked in today");
      setShow(false);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end min-[520px]:items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="checkin-title">
      <div className="w-[400px] max-w-full bg-panel rounded-3xl shadow-[var(--sh)] p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 flex-none rounded-2xl bg-g50 text-g700 flex items-center justify-center">
            <Clock size={20} strokeWidth={2.4} />
          </span>
          <div className="flex-1">
            <h2 id="checkin-title" className="text-[17px] font-extrabold m-0">
              Good to see you — check in?
            </h2>
            <p className="m-0 mt-1 text-[12.5px] text-ink2">Record today&apos;s attendance. It takes one tap.</p>
          </div>
          <button onClick={later} title="Later" className="iconbtn border-0 cursor-pointer w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center">
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div
          className="px-4 py-3 rounded-2xl text-[12.5px] font-semibold"
          style={lateBy > 0 ? { background: "var(--amber50)", color: "#8a5a10" } : { background: "var(--g50)", color: "var(--g700)" }}
        >
          Shift starts {fmtShift(data.shiftStart)}
          {data.graceMinutes ? ` (${data.graceMinutes} min grace)` : ""}.{" "}
          {lateBy > 0 ? `You're ${lateBy >= 60 ? `${Math.floor(lateBy / 60)} h ${lateBy % 60} min` : `${lateBy} min`} past it — you'll be marked late.` : "You're on time."}
        </div>

        {variant === "field" && (
          <p className="m-0 flex items-center gap-2 text-[11.5px] text-ink3">
            <MapPin size={13} strokeWidth={2.4} />
            Your location is saved with the check-in.
          </p>
        )}

        {error && <div className="text-[12px] font-semibold text-red">{error}</div>}

        <div className="flex gap-2">
          <button onClick={later} className="flex-1 border border-line cursor-pointer rounded-full py-3 text-[13px] font-bold bg-white text-ink2">
            Later
          </button>
          <button
            onClick={checkIn}
            disabled={pending}
            autoFocus
            className="flex-[2] btnp border-0 cursor-pointer rounded-full py-3 flex items-center justify-center gap-2 text-[13.5px] font-bold bg-g600 text-white disabled:opacity-60"
          >
            <LogIn size={16} strokeWidth={2.6} />
            {pending ? "Checking in…" : "Check in now"}
          </button>
        </div>
      </div>
    </div>
  );
}
