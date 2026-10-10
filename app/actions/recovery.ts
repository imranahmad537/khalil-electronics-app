"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";

// Owner/manager override. Approval belongs to the AVO's house visit; the
// office can only reject — at any stage, including after the AVO approved.
// reject_verification() cancels exactly that verification's agreement and
// restores stock, or refuses if field collections were already posted.
export async function rejectVerificationAction(
  verificationId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_verification", { p_verification: verificationId, p_reason: reason });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not reject this verification.") };

  revalidatePath("/recovery");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/products");
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
  if (error) return { ok: false, error: friendlyDbError(error) };

  revalidatePath("/recovery");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { ok: true, count: input.customerIds.length };
}
