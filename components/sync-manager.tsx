"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CloudOff, RotateCw, Trash2 } from "lucide-react";
import {
  QUEUE_CHANGED_EVENT,
  getQueuedReceipts,
  newClientRef,
  removeQueuedReceipt,
  updateQueuedReceipt,
  type QueuedReceipt,
} from "@/lib/offline-queue";
import { postReceiptAction } from "@/app/actions/receipts";
import { money } from "@/lib/money";
import { showToast } from "@/lib/toast";

// Drains the offline receipt queue and keeps it visible.
// - Network failure: the item stays queued and is retried on the next
//   "online" event (its clientRef makes a retry of an already-saved receipt a
//   no-op on the server).
// - Server rejection (agreement closed, amount too high…): the item is marked
//   failed and shown here for the officer to review — never silently retried
//   forever, and never silently dropped.
export function SyncManager() {
  const router = useRouter();
  const syncing = useRef(false);
  const [items, setItems] = useState<QueuedReceipt[]>([]);
  const [confirmDiscard, setConfirmDiscard] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await getQueuedReceipts());
    } catch {
      setItems([]);
    }
  }, []);

  const flush = useCallback(
    async (retryFailedId?: number) => {
      if (syncing.current || !navigator.onLine) return;
      syncing.current = true;
      let synced = 0;
      try {
        const queued = await getQueuedReceipts();
        for (const raw of queued) {
          if (raw.id === undefined) continue;
          if (raw.failedError && raw.id !== retryFailedId) continue;

          // items queued before idempotency keys existed
          const item: QueuedReceipt = {
            ...raw,
            clientRef: raw.clientRef ?? newClientRef(),
            mode: raw.mode ?? "cash",
            account: raw.account ?? "cash_in_hand",
          };
          if (!raw.clientRef) await updateQueuedReceipt(item);

          let res: Awaited<ReturnType<typeof postReceiptAction>>;
          try {
            res = await postReceiptAction({
              agreementId: item.agreementId,
              amount: item.amount,
              mode: item.mode,
              account: item.account,
              clientRef: item.clientRef,
              lat: item.lat,
              lng: item.lng,
            });
          } catch {
            break; // connection dropped again — keep everything for the next online event
          }

          if (res.ok) {
            await removeQueuedReceipt(raw.id);
            synced++;
            showToast(`Synced: ${money(item.amount)} from ${item.customerName}`);
          } else {
            await updateQueuedReceipt({ ...item, failedError: res.error, failedAt: new Date().toISOString() });
            showToast(`Not synced: ${money(item.amount)} from ${item.customerName} — ${res.error}`);
          }
        }
        if (synced > 0) router.refresh();
      } finally {
        syncing.current = false;
        await refresh();
      }
    },
    [refresh, router]
  );

  useEffect(() => {
    refresh();
    flush();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    window.addEventListener(QUEUE_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refresh);
    };
  }, [flush, refresh]);

  const waiting = items.filter((i) => !i.failedError);
  const failed = items.filter((i) => i.failedError);
  if (items.length === 0) return null;

  return (
    <div className="rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] p-4 flex flex-col gap-3">
      {waiting.length > 0 && (
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink2">
          <CloudOff size={15} strokeWidth={2.4} />
          {waiting.length} receipt{waiting.length === 1 ? "" : "s"} ({money(waiting.reduce((t, i) => t + i.amount, 0))}) waiting to sync
        </div>
      )}
      {failed.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[12.5px] font-bold text-red">
            <AlertTriangle size={15} strokeWidth={2.4} />
            {failed.length} collection{failed.length === 1 ? "" : "s"} not recorded — needs review
          </div>
          {failed.map((i) => (
            <div key={i.id} className="flex flex-col gap-2 p-3 rounded-xl bg-soft">
              <div className="text-[13px] font-bold">
                {money(i.amount)} · {i.customerName}
              </div>
              <div className="text-[11.5px] text-ink2">
                Collected {new Date(i.queuedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} · {i.failedError}
              </div>
              {confirmDiscard === i.id ? (
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="font-semibold text-red flex-1">Discard? The money stays unrecorded.</span>
                  <button
                    onClick={async () => {
                      await removeQueuedReceipt(i.id!);
                      setConfirmDiscard(null);
                    }}
                    className="rounded-full px-3 py-[6px] font-bold bg-red text-white"
                  >
                    Discard
                  </button>
                  <button onClick={() => setConfirmDiscard(null)} className="rounded-full px-3 py-[6px] font-bold border border-line bg-white">
                    Keep
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => flush(i.id)}
                    className="rounded-full px-3 py-[6px] text-[12px] font-bold border border-line bg-white text-g700 flex items-center gap-1"
                  >
                    <RotateCw size={12} strokeWidth={2.6} />
                    Retry
                  </button>
                  <button
                    onClick={() => setConfirmDiscard(i.id!)}
                    className="rounded-full px-3 py-[6px] text-[12px] font-bold border border-line bg-white text-ink2 flex items-center gap-1"
                  >
                    <Trash2 size={12} strokeWidth={2.6} />
                    Discard
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
