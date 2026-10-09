"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPermissions } from "@/lib/current-user";

export interface PurchaseItemInput {
  productId: string;
  qty: number;
  unitCost: number;
}

export async function createPurchaseAction(input: {
  vendorId: string;
  billNo: string;
  billDate: string;
  notes: string;
  items: PurchaseItemInput[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageFinance) {
    return { ok: false, error: "Your role doesn't have access to purchases." };
  }
  if (!input.vendorId) return { ok: false, error: "Choose a vendor." };
  const items = input.items.filter((i) => i.productId && i.qty > 0);
  if (items.length === 0) return { ok: false, error: "Add at least one item." };

  const supabase = await createClient();

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      vendor_id: input.vendorId,
      bill_no: input.billNo.trim() || null,
      bill_date: input.billDate,
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();

  if (purchaseError || !purchase) return { ok: false, error: purchaseError?.message ?? "Could not create purchase." };

  // on_purchase_item trigger bumps products.stock/cost and purchases.total per row inserted
  const { error: itemsError } = await supabase.from("purchase_items").insert(
    items.map((i) => ({
      purchase_id: purchase.id,
      product_id: i.productId,
      qty: i.qty,
      unit_cost: i.unitCost,
    }))
  );

  if (itemsError) return { ok: false, error: itemsError.message };

  revalidatePath("/vendors");
  revalidatePath("/products");
  return { ok: true };
}
