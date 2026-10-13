"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { checkOutAction } from "@/app/actions/attendance";
import { getPositionSafe, getQueuedReceipts } from "@/lib/offline-queue";
import { fmtTime } from "@/lib/attendance";
import { showToast } from "@/lib/toast";
import type { MyAttendanceToday } from "@/lib/data/attendance";

/**
 * Logs out, but first:
 * - if this device holds receipts collected offline that haven't synced, says
 *   so (they stay on the device and sync at the next login);
 * - if the person is still checked in today, offers to check out — the most
 *   common way a day ends up with no check-out time.
 */
export function LogoutButton({ variant, attendance }: { variant: "office" | "field"; attendance?: MyAttendanceToday }) {
  const [pending, startTransition] = useTransition();
  const [ask, setAsk] = useState<{ unsynced: number; checkedInAt: string | null } | null>(null);
  const field = variant === "field";

  const stillIn = attendance?.linked && attendance.record?.checkIn && !attendance.record.checkOut ? attendance.record.checkIn : null;

  function logout(alsoCheckOut: boolean) {
    startTransition(async () => {
      if (alsoCheckOut) {
        const pos = field ? await getPositionSafe() : null;
        try {
          const res = await checkOutAction(pos?.lat ?? null, pos?.lng ?? null);
          // "already checked out" (another tab/device) is fine — anything else, stay and say why
          if (!res.ok && !/already checked out/i.test(res.error)) {
            showToast(`Couldn't check out: ${res.error}`);
            return;
          }
        } catch {
          showToast("No connection — couldn't check out. Try again, or just log out.");
          return;
        }
      }
      await signOutAction();
    });
  }

  async function onClick() {
    let unsynced = 0;
    try {
      unsynced = (await getQueuedReceipts()).length;
    } catch {
      unsynced = 0;
    }
    if (unsynced > 0 || stillIn) setAsk({ unsynced, checkedInAt: stillIn });
    else logout(false);
  }

  if (ask) {
    const text = field ? "text-white" : "text-ink2";
    const ghost = field ? "bg-white/[.14] text-white" : "bg-soft text-ink2";
    return (
      <span className={`flex items-center gap-1 flex-wrap justify-end text-[11.5px] font-semibold ${text}`}>
        {ask.unsynced > 0 && (
          <span>
            {ask.unsynced} receipt{ask.unsynced === 1 ? "" : "s"} not synced yet.
          </span>
        )}
        {ask.checkedInAt && <span>Checked in since {fmtTime(ask.checkedInAt)}.</span>}
        {ask.checkedInAt && (
          <button onClick={() => logout(true)} disabled={pending} className="rounded-full px-[10px] py-[6px] font-bold bg-g600 text-white disabled:opacity-60">
            {pending ? "…" : "Check out & log out"}
          </button>
        )}
        <button
          onClick={() => logout(false)}
          disabled={pending}
          className={`rounded-full px-[10px] py-[6px] font-bold disabled:opacity-60 ${ask.checkedInAt ? ghost : "bg-red text-white"}`}
        >
          {ask.checkedInAt ? "Just log out" : pending ? "…" : "Log out anyway"}
        </button>
        <button onClick={() => setAsk(null)} className={`rounded-full px-[10px] py-[6px] font-bold ${ghost}`}>
          Stay
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      title="Log out"
      className={
        field
          ? "flex-none border-0 cursor-pointer rounded-full px-[11px] py-[7px] flex items-center gap-[6px] text-[12px] font-bold bg-white/[.14] text-white disabled:opacity-60"
          : "iconbtn flex-none border-0 cursor-pointer h-9 rounded-full px-[12px] flex items-center gap-[6px] text-[12.5px] font-bold bg-soft text-ink2 disabled:opacity-60"
      }
    >
      <LogOut size={15} strokeWidth={2.4} />
      <span className={field ? "" : "hide-sm"}>{pending ? "Logging out…" : "Log out"}</span>
    </button>
  );
}
