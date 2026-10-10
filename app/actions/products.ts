"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";

export async function createProductAction(input: {
  name: string;
  categoryId: string | null;
  vendorId: string | null;
  model: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    name: input.name.trim(),
    category_id: input.categoryId ? Number(input.categoryId) : null,
    vendor_id: input.vendorId || null,
    model: input.model.trim() || null,
    cost: input.cost,
    price: input.price,
    stock: input.stock,
    min_stock: input.minStock,
  });

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/products");
  return { ok: true };
}
