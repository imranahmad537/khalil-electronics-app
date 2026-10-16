import type { GuarantorBrief } from "@/lib/guarantors";

/** Table cell: one line per guarantor (name + cell), or the recorded waiver. */
export function GuarantorList({
  guarantors,
  noGuarantorReason,
  showCell = true,
}: {
  guarantors: GuarantorBrief[];
  noGuarantorReason: string | null;
  showCell?: boolean;
}) {
  if (guarantors.length === 0) {
    return noGuarantorReason ? (
      <span className="flex flex-col min-w-0">
        <span className="text-[12.5px] font-bold text-ink2">No guarantor</span>
        <span className="text-[11.5px] text-ink3 truncate">{noGuarantorReason}</span>
      </span>
    ) : (
      <span className="text-[13px] text-ink3">—</span>
    );
  }
  return (
    <span className="flex flex-col gap-[3px] min-w-0">
      {guarantors.map((g) => (
        <span key={g.slot} className="flex flex-col min-w-0 leading-[1.25]">
          <span className="text-[12.5px] font-semibold text-ink truncate">{g.name}</span>
          {showCell && g.cell && <span className="num text-[11px] text-ink3">{g.cell}</span>}
        </span>
      ))}
    </span>
  );
}
