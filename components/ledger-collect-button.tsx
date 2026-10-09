"use client";

import { useState } from "react";
import { Banknote } from "lucide-react";
import { CollectDialog, type CollectAgreement } from "@/components/collect-dialog";

export function LedgerCollectButton({
  customerName,
  accNo,
  avoName,
  agreement,
}: {
  customerName: string;
  accNo: string;
  avoName: string;
  agreement: CollectAgreement;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 flex items-center gap-[6px] text-xs font-bold bg-g600 text-white"
      >
        <Banknote size={15} strokeWidth={2.4} />
        Collect
      </button>
      <CollectDialog
        open={open}
        onClose={() => setOpen(false)}
        customerName={customerName}
        accNo={accNo}
        avoName={avoName}
        agreements={[agreement]}
      />
    </>
  );
}
