export function money(n: number): string {
  return "Rs " + Math.round(n).toLocaleString("en-US");
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
