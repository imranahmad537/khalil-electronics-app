// The shop runs on Pakistan time (UTC+5, no DST). Server code runs on UTC
// (Vercel, Supabase), so "today" must be computed explicitly — `setHours(0)`
// on the server gives UTC midnight, which is 05:00 in the shop. Mirrors
// shop_today() in supabase/migrations/0006_hardening.sql.

export const SHOP_TZ = "Asia/Karachi";
const SHOP_OFFSET_MS = 5 * 60 * 60 * 1000;

/** YYYY-MM-DD for the shop's current calendar day. */
export function shopTodayStr(now = new Date()): string {
  return new Date(now.getTime() + SHOP_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO timestamp of the most recent shop midnight — for `collected_at >= …`. */
export function shopTodayStartISO(now = new Date()): string {
  return new Date(Date.parse(`${shopTodayStr(now)}T00:00:00Z`) - SHOP_OFFSET_MS).toISOString();
}

/** YYYY-MM-01 for the shop's current month. */
export function shopMonthStartStr(now = new Date()): string {
  return `${shopTodayStr(now).slice(0, 7)}-01`;
}

/** ISO timestamp of the shop's midnight on the 1st of the current month. */
export function shopMonthStartISO(now = new Date()): string {
  return shopDateStartISO(shopMonthStartStr(now));
}

/** ISO timestamp of shop midnight on a YYYY-MM-DD date. */
export function shopDateStartISO(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - SHOP_OFFSET_MS).toISOString();
}

/** Shop-calendar bounds of a month ("YYYY-MM", default: this month), end exclusive. */
export function shopMonthRange(monthKey?: string) {
  const key = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : shopMonthStartStr().slice(0, 7);
  const [y, m] = key.split("-").map(Number);
  const startDate = `${key}-01`;
  const endDate = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  return { startDate, endDate, startISO: shopDateStartISO(startDate), endISO: shopDateStartISO(endDate) };
}
