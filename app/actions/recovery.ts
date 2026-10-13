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

/**
 * Assign customers to a field officer. A customer has exactly one officer, so
 * assigning someone who belongs to another active officer is a transfer: it
 * needs `transfer: true` (the dialog asks first) and is recorded in the
 * assignment history (assign_customers, 0013_customer_assignment.sql).
 */
export async function bulkAssignAvoAction(input: {
  customerIds: string[];
  avoId: string;
  transfer: boolean;
  reason: string;
}): Promise<{ ok: true; assigned: number; transferred: number; unchanged: number } | { ok: false; error: string }> {
  if (input.customerIds.length === 0) return { ok: false, error: "Select at least one customer." };
  if (!input.avoId) return { ok: false, error: "Choose an officer." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("assign_customers", {
    p_customers: input.customerIds,
    p_avo: input.avoId,
    p_transfer: input.transfer,
    p_reason: input.reason.trim() || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };
  const r = data as { assigned: number; transferred: number; unchanged: number };

  revalidatePath("/recovery");
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/avo");
  return { ok: true, assigned: r.assigned, transferred: r.transferred, unchanged: r.unchanged };
}
