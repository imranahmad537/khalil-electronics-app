"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getQueuedReceipts, removeQueuedReceipt } from "@/lib/offline-queue";
import { postReceiptAction } from "@/app/actions/receipts";
import { money } from "@/lib/money";
import { showToast } from "@/lib/toast";

export function SyncManager() {
  const router = useRouter();
  const syncing = useRef(false);

  useEffect(() => {
    async function flush() {
      if (syncing.current || !navigator.onLine) return;
      syncing.current = true;
      try {
        const queued = await getQueuedReceipts();
        for (const item of queued) {
          if (item.id === undefined) continue;
          const res = await postReceiptAction({
            agreementId: item.agreementId,
            amount: item.amount,
            lat: item.lat,
            lng: item.lng,
          });
          if (res.ok) {
            await removeQueuedReceipt(item.id);
            showToast(`Synced: ${money(item.amount)} from ${item.customerName}`);
          }
        }
        if (queued.length > 0) router.refresh();
      } finally {
        syncing.current = false;
      }
    }

    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
