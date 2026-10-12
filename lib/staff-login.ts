// Staff log in with a username. Supabase Auth needs an email, so each username
// maps to an internal address on a domain that never receives mail.
export const STAFF_EMAIL_DOMAIN = "staff.khalil.local";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
export const USERNAME_HINT = "3–30 characters: lowercase letters, numbers, dot, dash or underscore";
export const MIN_PASSWORD = 8;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${STAFF_EMAIL_DOMAIN}`;
}

/** Login box accepts either a username or a full email (older/owner accounts). */
export function loginIdToEmail(id: string): string {
  const v = id.trim();
  return v.includes("@") ? v : usernameToEmail(v);
}

export function usernameError(username: string): string | null {
  return USERNAME_PATTERN.test(normalizeUsername(username)) ? null : USERNAME_HINT;
}

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `At least ${MIN_PASSWORD} characters`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use letters and numbers";
  return null;
}

/** Easy to read out loud or type on a phone: no 0/O, 1/l/I. e.g. "Kmt-4829-wqr" */
export function generatePassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, n: number) =>
    Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join("");
  const first = pick(letters, 3);
  return `${first[0].toUpperCase()}${first.slice(1)}-${pick(digits, 4)}-${pick(letters, 3)}`;
}
