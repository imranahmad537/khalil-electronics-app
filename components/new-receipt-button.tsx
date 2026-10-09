"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CollectDialog } from "@/components/collect-dialog";
import { showToast } from "@/lib/toast";
import type { PendingCustomer } from "@/lib/data/receipts";

export function NewReceiptButton({ pendingCustomers }: { pendingCustomers: PendingCustomer[] }) {
  const [open, setOpen] = useState(false);
  const first = pendingCustomers[0] ?? null;

  return (
    <>
      <button
        onClick={() => (first ? setOpen(true) : showToast("No pending dues this month"))}
        className="btnp border-0 cursor-pointer rounded-full px-[21px] py-3 flex items-center gap-2 text-[13.5px] font-bold bg-g600 text-white"
        style={{ boxShadow: "0 6px 16px rgba(15,107,60,.22)" }}
      >
        <Plus size={16} strokeWidth={2.4} />
        New receipt
      </button>
      {first && (
        <CollectDialog
          open={open}
          onClose={() => setOpen(false)}
          customerName={first.fullName}
          accNo={first.accNo}
          avoName={first.avoName}
          agreements={first.agreements}
        />
      )}
    </>
  );
}
