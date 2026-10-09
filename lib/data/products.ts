import { createClient } from "@/lib/supabase/server";

export interface ProductRow {
  id: string;
  name: string;
  categoryName: string | null;
  vendorName: string | null;
  model: string | null;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
}

export interface ProductsData {
  rows: ProductRow[];
  stockValue: number;
  categoryCount: number;
  belowMinCount: number;
  avgMarginPct: number;
}

export async function getProductsData(): Promise<ProductsData> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, model, cost, price, stock, min_stock, categories(name), vendors(name)")
    .order("name");

  if (error) throw new Error(error.message);

  type ProductRecord = {
    id: string;
    name: string;
    model: string | null;
    cost: number;
    price: number;
    stock: number;
    min_stock: number;
    categories: { name: string } | null;
    vendors: { name: string } | null;
  };
  const records = (data ?? []) as unknown as ProductRecord[];

  const rows: ProductRow[] = records.map((p) => ({
    id: p.id,
    name: p.name,
    categoryName: p.categories?.name ?? null,
    vendorName: p.vendors?.name ?? null,
    model: p.model,
    cost: p.cost,
    price: p.price,
    stock: p.stock,
    minStock: p.min_stock,
  }));

  const stockValue = rows.reduce((t, p) => t + p.cost * p.stock, 0);
  const categoryCount = new Set(rows.map((p) => p.categoryName).filter(Boolean)).size;
  const belowMinCount = rows.filter((p) => p.stock <= p.minStock).length;
  const withCost = rows.filter((p) => p.cost > 0);
  const avgMarginPct = withCost.length
    ? Math.round((withCost.reduce((t, p) => t + (p.price - p.cost) / p.cost, 0) / withCost.length) * 100)
    : 0;

  return { rows, stockValue, categoryCount, belowMinCount, avgMarginPct };
}

export interface SelectOption {
  id: string;
  name: string;
}

export async function getCategoryOptions(): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: String(c.id), name: c.name }));
}

export async function getVendorOptions(): Promise<SelectOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendors").select("id, name").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ProductOption {
  id: string;
  name: string;
  cost: number;
}

export async function getProductOptionsWithCost(): Promise<ProductOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("id, name, cost").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
