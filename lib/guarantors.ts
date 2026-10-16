// Guarantors are flexible: an installment customer has 1–4 on file, or none
// with a recorded reason (customers.no_guarantor_reason). See 0014_flexible_guarantors.sql.

export const MAX_GUARANTORS = 4;

/** Quick picks for the waiver reason; staff can also type their own. */
export const NO_GUARANTOR_REASONS = ["Relative / family", "Trusted repeat customer", "Shop staff"] as const;

export interface GuarantorBrief {
  slot: number;
  name: string;
  cell: string | null;
  cnic: string | null;
}

export function toGuarantorBriefs(
  rows: { slot: number; full_name: string; cell: string | null; cnic?: string | null }[] | null | undefined
): GuarantorBrief[] {
  return (rows ?? [])
    .map((g) => ({ slot: g.slot, name: g.full_name, cell: g.cell, cnic: g.cnic ?? null }))
    .sort((a, b) => a.slot - b.slot);
}

/** One-line summary for tables: "Asad Khan, Bilal Ahmed" / "No guarantor · Relative / family" / "—". */
export function guarantorSummary(list: GuarantorBrief[], noGuarantorReason: string | null): string {
  if (list.length > 0) return list.map((g) => g.name).join(", ");
  if (noGuarantorReason) return `No guarantor · ${noGuarantorReason}`;
  return "—";
}

/** Text to match a guarantor search against (names, cells, CNICs). */
export function guarantorSearchText(list: GuarantorBrief[]): string {
  return list.map((g) => [g.name, g.cell ?? "", g.cnic ?? ""].join(" ")).join(" ");
}
