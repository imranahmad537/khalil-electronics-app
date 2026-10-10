"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { isMoneyAccount, isPayMode, type MoneyAccount, type PayMode } from "@/lib/payment";

export async function postReceiptAction(input: {
  agreementId: string;
  amount: number;
  mode: PayMode;
  account: MoneyAccount;
  /** Idempotency key: generated once per collection, reused by every retry/sync of it. */
  clientRef: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<{ ok: true; receiptId: string } | { ok: false; error: string }> {
  if (!(input.amount > 0)) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  if (!isPayMode(input.mode) || !isMoneyAccount(input.account)) {
    return { ok: false, error: "Choose how the payment was received." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_receipt", {
    p_agreement: input.agreementId,
    p_amount: input.amount,
    p_mode: input.mode,
    p_account: input.account,
    p_client_ref: input.clientRef,
    p_lat: input.lat ?? undefined,
    p_lng: input.lng ?? undefined,
  });

  if (error) {
    return { ok: false, error: friendlyDbError(error, "Could not post the receipt.") };
  }

  revalidatePath("/dashboard");
  revalidatePath("/customers");
  revalidatePath("/receipts");
  revalidatePath("/recovery");
  revalidatePath("/avo");

  return { ok: true, receiptId: data as string };
}
