import { notFound } from "next/navigation";
import { getReceiptSlip } from "@/lib/data/receipts";
import { money } from "@/lib/money";
import { SHOP_NAME } from "@/lib/constants";
import { AutoPrint } from "@/components/auto-print";
import { PrintAgainButton } from "@/components/print-again-button";

const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
};
const ACCOUNT_LABEL: Record<string, string> = {
  cash_in_hand: "Cash in hand",
  meezan_bank: "Meezan Bank",
  jazzcash: "JazzCash",
};

export default async function ReceiptPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slip = await getReceiptSlip(id);
  if (!slip) notFound();

  const collected = new Date(slip.collectedAt);

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-6 print:bg-white print:p-0">
      <AutoPrint />

      <div className="w-[360px] max-w-full bg-white rounded-2xl shadow-[var(--sh)] p-7 flex flex-col gap-5 print:shadow-none print:rounded-none">
        <div className="flex flex-col items-center gap-1 text-center border-b border-dashed border-line pb-4">
          <div className="text-[16px] font-extrabold">{SHOP_NAME}</div>
          <div className="text-[11.5px] text-ink3">Payment Receipt</div>
        </div>

        <div className="flex flex-col gap-2 text-[13px]">
          <Row label="Receipt no." value={"#" + slip.receiptNo} />
          <Row label="Date" value={collected.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })} />
          <Row label="Time" value={collected.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} />
          <Row label="Customer" value={slip.customerName} />
          <Row label="Account" value={slip.accNo} />
          {slip.agreementNo > 0 && <Row label="Agreement" value={"#" + slip.agreementNo} />}
          <Row label="Collected by" value={slip.officerName} />
          <Row label="Mode" value={MODE_LABEL[slip.mode] ?? slip.mode} />
          <Row label="Posted to" value={ACCOUNT_LABEL[slip.account] ?? slip.account} />
        </div>

        <div className="rounded-xl bg-g900 text-white p-4 flex flex-col items-center gap-1">
          <span className="text-[11px] font-bold tracking-[.06em] uppercase" style={{ color: "rgba(255,255,255,.7)" }}>
            Amount received
          </span>
          <span className="num text-[28px] font-extrabold">{money(slip.amount)}</span>
        </div>

        <div className="text-center text-[11.5px] text-ink3">Thank you for your payment.</div>

        <PrintAgainButton />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink3">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
