import { Box, Grid3x3, AlertCircle, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { DataTable, type DataRow } from "@/components/data-table";
import { AddProductDialog } from "@/components/add-product-dialog";
import { money } from "@/lib/money";
import { getProductsData, getCategoryOptions, getVendorOptions } from "@/lib/data/products";

const GRID = "minmax(200px,1.8fr) 106px minmax(150px,1.2fr) minmax(102px,1fr) minmax(102px,1fr) 94px 100px";
const COLUMNS = [
  { label: "Product", align: "left" as const },
  { label: "Category", align: "left" as const },
  { label: "Vendor", align: "left" as const },
  { label: "Cost", align: "right" as const },
  { label: "Price", align: "right" as const },
  { label: "Stock", align: "right" as const },
  { label: "Action", align: "right" as const },
];

export default async function ProductsPage() {
  const [data, categories, vendors] = await Promise.all([getProductsData(), getCategoryOptions(), getVendorOptions()]);

  const rows: DataRow[] = data.rows.map((p) => ({
    key: p.id,
    cells: [
      { kind: "text", text: p.name, sub: p.model ?? "", weight: 700 },
      p.categoryName
        ? { kind: "chip", label: p.categoryName, bg: "var(--soft)", fg: "var(--ink2)" }
        : { kind: "text", text: "—" },
      { kind: "text", text: p.vendorName ?? "—", weight: 500 },
      { kind: "text", text: money(p.cost), weight: 600, align: "right" },
      { kind: "text", text: money(p.price), weight: 700, align: "right" },
      {
        kind: "text",
        text: String(p.stock),
        sub: "min " + p.minStock,
        weight: 700,
        align: "right",
        fg: p.stock <= p.minStock ? "var(--red)" : undefined,
      },
      {
        kind: "node",
        align: "right",
        node: (
          <a
            href="/agreements/new"
            className="btnp border-0 cursor-pointer rounded-full px-[14px] py-2 text-xs font-bold bg-g600 text-white inline-block"
          >
            Sell
          </a>
        ),
      },
    ],
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Products" hint={`${data.rows.length} items · ${data.categoryCount} categories`}>
        <AddProductDialog categories={categories} vendors={vendors} />
      </PageHeader>

      <div className="kpis">
        <StatTile label="Stock value" value={money(data.stockValue)} note="At cost price" tone="hero" icon={Box} />
        <StatTile
          label="Products"
          value={String(data.rows.length)}
          note={`Across ${data.categoryCount} categories`}
          tone="plain"
          icon={Grid3x3}
        />
        <StatTile
          label="Below minimum"
          value={String(data.belowMinCount)}
          note="Reorder needed"
          tone="warn"
          icon={AlertCircle}
        />
        <StatTile
          label="Average margin"
          value={`${data.avgMarginPct}%`}
          note="Sale price over cost"
          tone="good"
          icon={TrendingUp}
        />
      </div>

      <div className="p-[19px_20px_8px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <h2 className="text-[16.5px] font-extrabold m-0">Stock on hand</h2>
        <DataTable gridTemplate={GRID} columns={COLUMNS} rows={rows} minWidth={960} />
        <div className="px-1 py-3 text-xs text-ink2">{data.belowMinCount} items below minimum</div>
      </div>
    </div>
  );
}
