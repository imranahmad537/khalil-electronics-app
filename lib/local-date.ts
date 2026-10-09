/**
 * Today's date as YYYY-MM-DD in the *browser's* local timezone — for
 * defaulting a date <input> to "today" from the user's own point of view.
 *
 * `new Date().toISOString().slice(0, 10)` looks equivalent but isn't: it
 * converts through UTC first, so anywhere west-of-UTC-negative... actually
 * anywhere with a positive UTC offset (e.g. Pakistan, UTC+5) it reports
 * "yesterday" for the first few hours after local midnight. Don't use it for
 * this purpose.
 */
export function todayLocalDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
