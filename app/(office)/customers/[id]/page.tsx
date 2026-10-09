import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Receipt as ReceiptIcon } from "lucide-react";
import { getCustomerLedger, type LedgerAgreement } from "@/lib/data/customers";
import { money } from "@/lib/money";
import { initials } from "@/lib/money";
import { LedgerCollectButton } from "@/components/ledger-collect-button";

const INST_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  upcoming: { bg: "var(--soft)", fg: "var(--ink3)", label: "Upcoming" },
  due: { bg: "var(--soft)", fg: "var(--ink2)", label: "Due" },
  short: { bg: "var(--amber50)", fg: "#8a5a10", label: "Short paid" },
  overdue: { bg: "var(--amber50)", fg: "#9a4a08", label: "Overdue" },
  default: { bg: "var(--red50)", fg: "var(--red)", label: "Defaulter" },
  paid: { bg: "var(--g50)", fg: "var(--g700)", label: "Paid" },
};

const AGREEMENT_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  pending_verification: { bg: "var(--amber50)", fg: "#8a5a10", label: "Pending verification" },
  open: { bg: "var(--g50)", fg: "var(--g700)", label: "Open" },
  closed: { bg: "var(--soft)", fg: "var(--ink2)", label: "Closed" },
  cancelled: { bg: "var(--red50)", fg: "var(--red)", label: "Cancelled" },
};

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default async function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ledger = await getCustomerLedger(id);
  if (!ledger) notFound();

  const { customer, guarantors, agreements, receipts } = ledger;
  const g1 = guarantors.find((g) => g.slot === 1);
  const g2 = guarantors.find((g) => g.slot === 2);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link
          href="/customers"
          className="iconbtn border-0 cursor-pointer w-9 h-9 rounded-full bg-panel shadow-[var(--sh)] text-ink2 flex items-center justify-center"
        >
          <ArrowLeft size={18} strokeWidth={2.4} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[26px] font-extrabold tracking-[-.6px] m-0 flex items-center gap-2">
            {customer.fullName}
            {customer.blacklisted && (
              <span className="text-[11px] font-bold px-[10px] py-[4px] rounded-full bg-red-50 text-red">
                Blacklisted
              </span>
            )}
          </h1>
          <p className="mt-1 mb-0 text-[12.5px] text-ink3">
            Acc {customer.accNo} · {customer.avoName}
          </p>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))" }}>
        <InfoCard title="Customer">
          <InfoRow label="Father / husband" value={customer.fatherName ?? "—"} />
          <InfoRow label="CNIC" value={customer.cnic ?? "—"} />
          <InfoRow label="Cell" value={customer.cell2 ? `${customer.cell} · ${customer.cell2}` : customer.cell} />
          <InfoRow label="Address" value={[customer.address, customer.area].filter(Boolean).join(", ") || "—"} />
          <InfoRow label="Occupation" value={customer.occupation ?? "—"} />
        </InfoCard>

        <GuarantorCard guarantor={g1} slot={1} />
        <GuarantorCard guarantor={g2} slot={2} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-[16.5px] font-extrabold m-0 px-0.5">Agreements</h2>
        {agreements.length === 0 && (
          <div className="p-7 text-center text-[13px] text-ink2 bg-panel rounded-[var(--r-lg)] shadow-[var(--sh)]">
            No agreements yet.{" "}
            <Link href="/agreements/new" className="font-bold">
              Start one
            </Link>
            .
          </div>
        )}
        {agreements.map((a) => (
          <AgreementCard key={a.id} agreement={a} customer={customer} />
        ))}
      </div>

      <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ReceiptIcon size={16} strokeWidth={2.4} className="text-g700" />
          <h2 className="text-[16.5px] font-extrabold m-0">Receipts</h2>
        </div>
        {receipts.length === 0 && <div className="text-[13px] text-ink2 py-2">No receipts posted yet.</div>}
        {receipts.map((r) => (
          <div key={r.id} className="flex items-center gap-3 py-2 border-b border-line">
            <div className="w-8 h-8 flex-none rounded-full bg-g50 text-g700 flex items-center justify-center text-[11px] font-extrabold">
              {initials(r.collectedBy ?? "??")}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <span className="text-[12.5px] font-bold">{r.collectedBy ?? "—"}</span>
              <span className="text-[11px] text-ink3">
                {r.mode} · {fmtDate(r.collectedAt)}
              </span>
            </div>
            <span className="num text-[13px] font-extrabold">{money(r.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-3">
      <div className="flex items-center gap-[9px]">
        <span className="w-[30px] h-[30px] rounded-[9px] bg-g50 text-g700 flex items-center justify-center">
          <ShieldCheck size={16} strokeWidth={2.4} />
        </span>
        <h2 className="text-[15.5px] font-extrabold m-0">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function GuarantorCard({
  guarantor,
  slot,
}: {
  guarantor: { fullName: string; fatherName: string | null; cnic: string | null; cell: string | null; address: string | null; relation: string | null } | undefined;
  slot: number;
}) {
  return (
    <InfoCard title={`Guarantor ${slot}`}>
      {guarantor ? (
        <>
          <InfoRow label="Name" value={guarantor.fullName} />
          <InfoRow label="Father / husband" value={guarantor.fatherName ?? "—"} />
          <InfoRow label="CNIC" value={guarantor.cnic ?? "—"} />
          <InfoRow label="Cell" value={guarantor.cell ?? "—"} />
          <InfoRow label="Relation" value={guarantor.relation ?? "—"} />
        </>
      ) : (
        <span className="text-[13px] text-ink2">Not recorded</span>
      )}
    </InfoCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span className="text-[11px] font-bold text-ink3 uppercase tracking-[.06em]">{label}</span>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function AgreementCard({
  agreement,
  customer,
}: {
  agreement: LedgerAgreement;
  customer: { fullName: string; accNo: string; avoName: string };
}) {
  const badge = AGREEMENT_BADGE[agreement.status] ?? AGREEMENT_BADGE.closed;

  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <h3 className="text-[15.5px] font-extrabold m-0">
            Agreement #{agreement.agreementNo} · {agreement.saleType === "direct" ? "Direct sale" : `${agreement.planMonths} mo`}
          </h3>
          <span className="text-[12px] text-ink3">Opened {fmtDate(agreement.openedOn)}</span>
        </div>
        <span
          className="text-[11px] font-bold px-[10px] py-[5px] rounded-full"
          style={{ background: badge.bg, color: badge.fg }}
        >
          {badge.label}
        </span>
        {agreement.collect && (
          <LedgerCollectButton
            customerName={customer.fullName}
            accNo={customer.accNo}
            avoName={customer.avoName}
            agreement={agreement.collect}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-6 text-[12.5px]">
        <Metric label="Total price" value={money(agreement.totalPrice)} />
        <Metric label="Advance" value={money(agreement.advance)} />
        <Metric label="Monthly" value={money(agreement.monthly)} />
        <div className="flex-1 min-w-[160px]">
          <div className="text-[11px] font-bold text-ink3 uppercase tracking-[.06em] mb-1">Items</div>
          {agreement.items.map((it, i) => (
            <div key={i} className="text-[13px] font-semibold">
              {it.qty} × {it.productName} @ {money(it.unitPrice)}
              {it.serialNo ? ` (${it.serialNo})` : ""}
            </div>
          ))}
        </div>
      </div>

      {agreement.installments.length > 0 && (
        <div className="tblwrap">
          <div className="tblinner" style={{ minWidth: 640 }}>
            <div
              className="grid gap-3 px-1 pb-2 border-b border-line text-[10.5px] font-bold tracking-[.08em] uppercase text-ink3"
              style={{ gridTemplateColumns: "60px minmax(100px,1fr) 100px 90px 100px 100px 120px" }}
            >
              <span>#</span>
              <span>Month</span>
              <span className="text-right">Due</span>
              <span className="text-right">Carry</span>
              <span className="text-right">Paid</span>
              <span className="text-right">Owed</span>
              <span>Status</span>
            </div>
            {agreement.installments.map((inst) => {
              const instBadge = INST_BADGE[inst.status] ?? INST_BADGE.upcoming;
              return (
                <div
                  key={inst.seq}
                  className="trow grid gap-3 items-center px-1 py-[10px] border-b border-line text-[13px]"
                  style={{ gridTemplateColumns: "60px minmax(100px,1fr) 90px 90px 100px 100px 120px" }}
                >
                  <span className="text-ink3">{inst.seq}</span>
                  <span>{fmtMonth(inst.dueMonth)}</span>
                  <span className="num text-right">{money(inst.dueAmount)}</span>
                  <span className="num text-right" style={{ color: inst.carryIn > 0 ? "var(--amber)" : inst.carryIn < 0 ? "var(--g600)" : undefined }}>
                    {inst.carryIn !== 0 ? money(inst.carryIn) : "—"}
                  </span>
                  <span className="num text-right">{money(inst.paid)}</span>
                  <span className="num text-right font-bold" style={{ color: inst.owed > 0 ? "var(--red)" : "var(--ink)" }}>
                    {inst.owed > 0 ? money(inst.owed) : "—"}
                  </span>
                  <span>
                    <span
                      className="text-[10.5px] font-bold px-[8px] py-[3px] rounded-full whitespace-nowrap"
                      style={{ background: instBadge.bg, color: instBadge.fg }}
                    >
                      {instBadge.label}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px] min-w-[110px]">
      <span className="text-[11px] font-bold text-ink3 uppercase tracking-[.06em]">{label}</span>
      <span className="num text-[14px] font-extrabold">{value}</span>
    </div>
  );
}
