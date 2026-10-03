import type { ReactNode } from "react";

export interface DataColumn {
  label: string;
  align?: "left" | "right";
}

export type DataCell =
  | { kind: "text"; text: string; sub?: string; weight?: number; fg?: string; align?: "left" | "right" }
  | { kind: "chip"; label: string; bg: string; fg: string; align?: "left" | "right" }
  | { kind: "node"; node: ReactNode; align?: "left" | "right" };

export interface DataRow {
  key: string;
  edge?: string;
  cells: DataCell[];
}

export function DataTable({
  gridTemplate,
  columns,
  rows,
  minWidth = 900,
  emptyMessage = "Nothing matches this filter.",
}: {
  gridTemplate: string;
  columns: DataColumn[];
  rows: DataRow[];
  minWidth?: number;
  emptyMessage?: string;
}) {
  return (
    <div className="tblwrap">
      <div className="tblinner" style={{ minWidth }}>
        <div
          className="grid gap-3 px-1 pb-2 border-b border-line text-[10.5px] font-bold tracking-[.08em] uppercase text-ink3"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((col) => (
            <span key={col.label} className={col.align === "right" ? "text-right" : undefined}>
              {col.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col">
          {rows.map((row) => (
            <div
              key={row.key}
              className="trow grid gap-3 items-center px-1 py-3 border-b border-line"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {row.cells.map((cell, i) => (
                <DataCellView key={i} cell={cell} />
              ))}
            </div>
          ))}
          {rows.length === 0 && <div className="p-7 text-center text-[13px] text-ink2">{emptyMessage}</div>}
        </div>
      </div>
    </div>
  );
}

function DataCellView({ cell }: { cell: DataCell }) {
  const align = cell.align === "right" ? "items-end" : "items-start";

  if (cell.kind === "node") {
    return (
      <div className={`min-w-0 flex flex-col gap-[3px] ${align}`}>
        {cell.node}
      </div>
    );
  }

  if (cell.kind === "chip") {
    return (
      <div className={`min-w-0 flex flex-col gap-[3px] ${align}`}>
        <span
          className="text-[11px] font-bold px-[10px] py-[5px] rounded-full whitespace-nowrap"
          style={{ background: cell.bg, color: cell.fg }}
        >
          {cell.label}
        </span>
      </div>
    );
  }

  return (
    <div className={`min-w-0 flex flex-col gap-[3px] ${align}`}>
      <span
        className={cell.align === "right" ? "num" : undefined}
        style={{
          fontSize: 13,
          fontWeight: cell.weight ?? 600,
          color: cell.fg ?? "var(--ink)",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {cell.text}
      </span>
      {cell.sub && (
        <span className="text-[11px] text-ink3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
          {cell.sub}
        </span>
      )}
    </div>
  );
}
