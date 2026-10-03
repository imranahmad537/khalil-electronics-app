"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postReceiptAction(input: {
  agreementId: string;
  amount: number;
}): Promise<{ ok: true; receiptId: string } | { ok: false; error: string }> {
  if (!(input.amount > 0)) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_receipt", {
    p_agreement: input.agreementId,
    p_amount: input.amount,
    p_mode: "cash",
    p_account: "cash_in_hand",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath("/receipts");
  revalidatePath("/recovery");

  return { ok: true, receiptId: data as string };
}
