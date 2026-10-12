import { SHOP_NAME } from "@/lib/constants";

/**
 * Khalil Electronics mark + wordmark.
 * tone "light" sits on the dark green brand panel; "dark" on white surfaces.
 */
export function BrandLogo({
  tone = "dark",
  size = 40,
  wordmark = true,
  tagline,
}: {
  tone?: "light" | "dark";
  size?: number;
  wordmark?: boolean;
  tagline?: string;
}) {
  const light = tone === "light";
  const [first, ...rest] = SHOP_NAME.split(" ");

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={SHOP_NAME} className="flex-none">
        <defs>
          <linearGradient id="ke-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={light ? "#ffffff" : "var(--g500)"} />
            <stop offset="1" stopColor={light ? "#d6ecdf" : "var(--g700)"} />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#ke-mark)" />
        {/* K: stem + two arms */}
        <path
          d="M15 13v22M15 25l11-12M18.5 21.5L27 35"
          stroke={light ? "var(--g900)" : "#ffffff"}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* installment steps */}
        <rect x="30" y="27" width="4.5" height="8" rx="1.6" fill={light ? "var(--g600)" : "#ffffff"} opacity=".55" />
        <rect x="35.5" y="21" width="4.5" height="14" rx="1.6" fill={light ? "var(--g600)" : "#ffffff"} opacity=".85" />
      </svg>
      {wordmark && (
        <div className="flex flex-col leading-[1.1]">
          <span className={`text-[17px] font-extrabold tracking-[-.3px] ${light ? "text-white" : "text-ink"}`}>
            {first} <span className="font-semibold opacity-80">{rest.join(" ")}</span>
          </span>
          {tagline && <span className={`text-[11.5px] font-semibold ${light ? "text-white/65" : "text-ink3"}`}>{tagline}</span>}
        </div>
      )}
    </div>
  );
}
