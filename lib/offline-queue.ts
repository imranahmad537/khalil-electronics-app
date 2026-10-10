import type { MoneyAccount, PayMode } from "@/lib/payment";

const DB_NAME = "ke-electronics-field";
const STORE = "pending-receipts";
export const QUEUE_CHANGED_EVENT = "ke-receipt-queue-changed";

export interface QueuedReceipt {
  id?: number;
  agreementId: string;
  amount: number;
  /** Same key the online attempt used, so a sync of an already-saved receipt is a no-op. */
  clientRef: string;
  mode: PayMode;
  account: MoneyAccount;
  lat: number | null;
  lng: number | null;
  customerName: string;
  queuedAt: string;
  /** Set when the server rejected it — it is then held for review, not retried. */
  failedError?: string;
  failedAt?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function write(fn: (store: IDBObjectStore) => void): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export function newClientRef(): string {
  return crypto.randomUUID();
}

export async function queueReceipt(receipt: Omit<QueuedReceipt, "id">): Promise<void> {
  await write((store) => store.add(receipt));
}

export async function getQueuedReceipts(): Promise<QueuedReceipt[]> {
  const db = await openDb();
  const result = await new Promise<QueuedReceipt[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedReceipt[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function updateQueuedReceipt(item: QueuedReceipt): Promise<void> {
  await write((store) => store.put(item));
}

export async function removeQueuedReceipt(id: number): Promise<void> {
  await write((store) => store.delete(id));
}

export function getPositionSafe(timeoutMs = 4000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
