"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
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

  if (items.some((i) => !Number.isInteger(i.qty) || !(i.unitCost >= 0))) return { ok: false, error: "Every item needs a whole quantity and a cost." };

  // one transaction: the bill and all its items, or nothing (create_purchase in 0010)
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_purchase", {
    p_vendor: input.vendorId,
    p_bill_no: input.billNo,
    p_bill_date: input.billDate,
    p_notes: input.notes,
    p_items: items.map((i) => ({ product_id: i.productId, qty: i.qty, unit_cost: i.unitCost })),
  });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save the purchase.") };

  revalidatePath("/vendors");
  revalidatePath("/products");
  return { ok: true };
}
