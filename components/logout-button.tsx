"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { getQueuedReceipts } from "@/lib/offline-queue";

/**
 * Logs out. If this device still holds receipts collected offline that
 * haven't synced, asks first — they stay on the device and sync on the next
 * login, but the officer should know before handing the phone over.
 */
export function LogoutButton({ variant }: { variant: "office" | "field" }) {
  const [pending, startTransition] = useTransition();
  const [unsynced, setUnsynced] = useState<number | null>(null);
  const field = variant === "field";

  function logout() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  async function onClick() {
    let count = 0;
    try {
      count = (await getQueuedReceipts()).length;
    } catch {
      count = 0;
    }
    if (count > 0) setUnsynced(count);
    else logout();
  }

  if (unsynced !== null) {
    return (
      <span className={`flex items-center gap-1 text-[11.5px] font-semibold ${field ? "text-white" : "text-ink2"}`}>
        {unsynced} receipt{unsynced === 1 ? "" : "s"} not synced yet.
        <button onClick={logout} disabled={pending} className="rounded-full px-[10px] py-[6px] font-bold bg-red text-white disabled:opacity-60">
          {pending ? "…" : "Log out anyway"}
        </button>
        <button
          onClick={() => setUnsynced(null)}
          className={`rounded-full px-[10px] py-[6px] font-bold ${field ? "bg-white/[.14] text-white" : "bg-soft text-ink2"}`}
        >
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
