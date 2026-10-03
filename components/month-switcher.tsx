"use client";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function MonthSwitcher() {
  const now = new Date();
  const current = monthKey(now);
  const months = [-1, 0, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { key: monthKey(d), label: monthLabel(d) };
  });

  return (
    <div className="flex gap-1 p-1 bg-panel rounded-full shadow-[var(--sh)]">
      {months.map((m) => {
        const active = m.key === current;
        return (
          <button
            key={m.key}
            disabled={!active}
            title={active ? undefined : "Monthly history isn't tracked yet — this view always shows the live collection month"}
            className="border-0 rounded-full px-[15px] py-2 text-[12.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background: active ? "var(--ink)" : "transparent",
              color: active ? "#fff" : "var(--ink2)",
              cursor: active ? "pointer" : undefined,
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
