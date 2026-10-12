"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut as CheckOutIcon, CheckCircle2 } from "lucide-react";
import { checkInAction, checkOutAction } from "@/app/actions/attendance";
import { getPositionSafe } from "@/lib/offline-queue";
import { showToast } from "@/lib/toast";
import { STATUS_LABEL, fmtShift, fmtTime } from "@/lib/attendance";
import type { MyAttendanceToday } from "@/lib/data/attendance";

/**
 * Self check-in / check-out for today. Hidden for logins that aren't linked
 * to an employee record (e.g. the owner or developer account).
 * variant "office" sits in the top bar; "field" sits on the dark AVO header.
 */
export function AttendanceWidget({ data, variant }: { data: MyAttendanceToday; variant: "office" | "field" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOut, setConfirmOut] = useState(false);

  if (!data.linked) return null;
  const rec = data.record;
  const field = variant === "field";

  const pill = field
    ? "rounded-full px-[13px] py-[8px] text-[12px] font-bold flex items-center gap-[6px] border-0 cursor-pointer disabled:opacity-60"
    : "rounded-full px-[13px] py-[7px] text-[12px] font-bold flex items-center gap-[6px] border-0 cursor-pointer whitespace-nowrap disabled:opacity-60";

  function checkIn() {
    startTransition(async () => {
      const pos = field ? await getPositionSafe() : null;
      const res = await checkInAction(pos?.lat ?? null, pos?.lng ?? null);
      showToast(res.ok ? (res.status === "late" ? "Checked in — marked late" : "Checked in — have a good day") : res.error);
      router.refresh();
    });
  }
  function checkOut() {
    startTransition(async () => {
      const pos = field ? await getPositionSafe() : null;
      const res = await checkOutAction(pos?.lat ?? null, pos?.lng ?? null);
      setConfirmOut(false);
      showToast(
        res.ok
          ? `Checked out after ${res.hours} h${res.status === "half_day" ? " — counted as a half day" : ""}`
          : res.error
      );
      router.refresh();
    });
  }

  // not checked in yet (an office mark like "leave" can still be overridden by checking in)
  if (!rec || !rec.checkIn) {
    if (rec && ["leave", "holiday", "absent"].includes(rec.status)) {
      return (
        <span className={`${pill} cursor-default`} style={{ background: field ? "rgba(255,255,255,.14)" : "var(--soft)", color: field ? "#fff" : "var(--ink2)" }}>
          Today: {STATUS_LABEL[rec.status]}
        </span>
      );
    }
    return (
      <button
        onClick={checkIn}
        disabled={pending}
        className={pill}
        style={{ background: field ? "#fff" : "var(--g600)", color: field ? "var(--g900)" : "#fff" }}
        title={`Shift starts ${fmtShift(data.shiftStart)}`}
      >
        <LogIn size={14} strokeWidth={2.6} />
        {pending ? "Checking in…" : "Check in"}
      </button>
    );
  }

  if (!rec.checkOut) {
    if (confirmOut) {
      return (
        <span className="flex items-center gap-1">
          <button onClick={checkOut} disabled={pending} className={pill} style={{ background: "var(--red)", color: "#fff" }}>
            {pending ? "…" : "Check out now"}
          </button>
          <button
            onClick={() => setConfirmOut(false)}
            className={pill}
            style={{ background: field ? "rgba(255,255,255,.14)" : "var(--soft)", color: field ? "#fff" : "var(--ink2)" }}
          >
            Cancel
          </button>
        </span>
      );
    }
    return (
      <button
        onClick={() => setConfirmOut(true)}
        className={pill}
        style={{ background: field ? "rgba(255,255,255,.14)" : "var(--g50)", color: field ? "#fff" : "var(--g700)" }}
        title="Check out"
      >
        <CheckOutIcon size={14} strokeWidth={2.6} />
        In since {fmtTime(rec.checkIn)} · Check out
      </button>
    );
  }

  return (
    <span
      className={`${pill} cursor-default`}
      style={{ background: field ? "rgba(255,255,255,.14)" : "var(--soft)", color: field ? "#fff" : "var(--ink2)" }}
    >
      <CheckCircle2 size={14} strokeWidth={2.6} />
      {fmtTime(rec.checkIn)} – {fmtTime(rec.checkOut)}
    </span>
  );
}
