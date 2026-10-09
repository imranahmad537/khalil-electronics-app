"use client";

export function PrintAgainButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print btnp border-0 cursor-pointer rounded-full px-5 py-3 text-[13px] font-bold bg-g600 text-white"
    >
      Print again
    </button>
  );
}
