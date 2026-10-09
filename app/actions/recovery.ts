"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function approveVerificationAction(
  verificationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_verification", { p_verification: verificationId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/recovery");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function rejectVerificationAction(
  verificationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: verification, error: fetchError } = await supabase
    .from("verifications")
    .select("customer_id")
    .eq("id", verificationId)
    .single();
  if (fetchError || !verification) return { ok: false, error: fetchError?.message ?? "Verification not found." };

  const { error } = await supabase.from("verifications").update({ status: "rejected" }).eq("id", verificationId);
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("agreements")
    .update({ status: "cancelled" })
    .eq("customer_id", verification.customer_id)
    .eq("status", "pending_verification");

  revalidatePath("/recovery");
  revalidatePath("/customers");
  return { ok: true };
}

export async function bulkAssignAvoAction(input: {
  customerIds: string[];
  avoId: string;
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (input.customerIds.length === 0) return { ok: false, error: "Select at least one customer." };
  if (!input.avoId) return { ok: false, error: "Choose an officer." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ avo_id: input.avoId }).in("id", input.customerIds);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/recovery");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true, count: input.customerIds.length };
}
