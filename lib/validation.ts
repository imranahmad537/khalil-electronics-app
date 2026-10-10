// Pakistani CNIC and mobile number formats, shared by every form and server
// action that takes them (agreement, guarantors, employees).

export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;
export const CELL_PATTERN = /^03\d{2}-\d{7}$/;

export const CNIC_HINT = "Format: 00000-0000000-0";
export const CELL_HINT = "Format: 03XX-XXXXXXX";

/** Formats digits as 00000-0000000-0 while typing. */
export function maskCnic(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 12);
  const p3 = digits.slice(12, 13);
  return [p1, p2, p3].filter(Boolean).join("-");
}

/** Formats digits as 03XX-XXXXXXX while typing. */
export function maskCell(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const p1 = digits.slice(0, 4);
  const p2 = digits.slice(4, 11);
  return [p1, p2].filter(Boolean).join("-");
}

/** Error message, or null when valid. Empty is allowed unless `required`. */
export function cnicError(value: string | null | undefined, required = false): string | null {
  const v = (value ?? "").trim();
  if (!v) return required ? "Required" : null;
  return CNIC_PATTERN.test(v) ? null : CNIC_HINT;
}

export function cellError(value: string | null | undefined, required = false): string | null {
  const v = (value ?? "").trim();
  if (!v) return required ? "Required" : null;
  return CELL_PATTERN.test(v) ? null : CELL_HINT;
}
