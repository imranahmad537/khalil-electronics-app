"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print btnp border-0 cursor-pointer rounded-full px-[18px] py-[11px] flex items-center gap-2 text-[13px] font-bold bg-g600 text-white"
    >
      <Printer size={15} strokeWidth={2.4} />
      Print / PDF
    </button>
  );
}
