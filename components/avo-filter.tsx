"use client";

import { useSearchParams, usePathname } from "next/navigation";

export function AvoFilter({ officers }: { officers: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("avo") ?? "all";

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("avo");
    else params.set("avo", value);
    const qs = params.toString();
    // Filtering happens client-side, so update the URL without a server round-trip.
    window.history.pushState(null, "", `${pathname}${qs ? "?" + qs : ""}`);
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="px-[14px] py-[9px] rounded-full border border-line bg-white text-[12.5px] font-semibold text-ink"
    >
      <option value="all">All officers</option>
      {officers.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
