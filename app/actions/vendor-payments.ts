"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { getCurrentPermissions } from "@/lib/current-user";

export async function recordVendorPaymentAction(input: {
  vendorId: string;
  amount: number;
  account: "cash_in_hand" | "meezan_bank" | "jazzcash";
  notes: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageFinance) {
    return { ok: false, error: "Your role doesn't have access to vendor payments." };
  }
  if (!input.vendorId) return { ok: false, error: "Choose a vendor." };
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("vendor_payments").insert({
    vendor_id: input.vendorId,
    amount: input.amount,
    account: input.account,
    notes: input.notes.trim() || null,
  });

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/vendors");
  return { ok: true };
}
