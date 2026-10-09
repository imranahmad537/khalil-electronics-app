"use client";

import { useState } from "react";
import { PayVendorDialog } from "@/components/pay-vendor-dialog";

export function VendorRowAction({ vendorId, vendorName, payable }: { vendorId: string; vendorName: string; payable: number }) {
  const [open, setOpen] = useState(false);

  if (payable <= 0) {
    return <span className="text-xs font-bold text-ink2">—</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-g600 text-white"
      >
        Pay
      </button>
      <PayVendorDialog open={open} onClose={() => setOpen(false)} vendorId={vendorId} vendorName={vendorName} payable={payable} />
    </>
  );
}
