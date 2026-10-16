// Installment plan lengths offered at the counter, longest first. To offer a new
// length, add it here — the database accepts any plan of 2–24 months
// (0015_flexible_plans.sql), so no migration is needed within that range.
export const PLAN_OPTIONS = [12, 10, 8, 6] as const;

export type PlanMonths = (typeof PLAN_OPTIONS)[number];

/** 0 = direct sale (full payment today). */
export type PlanChoice = PlanMonths | 0;

export function isPlanMonths(n: unknown): n is PlanMonths {
  return typeof n === "number" && (PLAN_OPTIONS as readonly number[]).includes(n);
}

export function isPlanChoice(n: unknown): n is PlanChoice {
  return n === 0 || isPlanMonths(n);
}

export function planNote(months: PlanMonths): string {
  if (months === PLAN_OPTIONS[0]) return "Lowest monthly amount";
  if (months === PLAN_OPTIONS[PLAN_OPTIONS.length - 1]) return "Quickest to pay off";
  return `${months - 1} months after today`;
}
