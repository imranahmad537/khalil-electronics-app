// Shared between the New Agreement form (client-side auto-fill as the user
// types an area) and the server action that creates the customer — the
// schema has no area → AVO mapping table, so this approximates "the area's
// AVO" by matching against each officer's zone string.
export function matchAvoByArea<T extends { zone: string | null }>(area: string, officers: T[]): T | null {
  if (!area.trim()) return null;
  const needle = area.toLowerCase();
  return (
    officers.find((o) => {
      if (!o.zone) return false;
      return o.zone
        .toLowerCase()
        .split("/")
        .map((p) => p.trim())
        .some((part) => part && (needle.includes(part) || part.includes(needle)));
    }) ?? null
  );
}
