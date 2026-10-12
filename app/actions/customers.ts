"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { getCurrentPermissions } from "@/lib/current-user";
import { cellError, cnicError } from "@/lib/validation";
import { isMoneyAccount, type MoneyAccount } from "@/lib/payment";

type Result = { ok: true } | { ok: false; error: string };

export interface CustomerEditInput {
  fullName: string;
  fatherName: string;
  cnic: string;
  cell: string;
  cell2: string;
  address: string;
  area: string;
  occupation: string;
}

function refresh(customerId: string) {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  revalidatePath("/recovery");
}

/** Office staff correct a customer's details (new number, moved house…). */
export async function updateCustomerAction(customerId: string, input: CustomerEditInput): Promise<Result> {
  const perms = await getCurrentPermissions();
  if (!perms.role || perms.role === "avo") return { ok: false, error: "Your role can't edit customers." };
  if (!input.fullName.trim()) return { ok: false, error: "Name is required." };
  const bad =
    (cnicError(input.cnic) && `CNIC: ${cnicError(input.cnic)}`) ||
    (cellError(input.cell, true) && `Cell: ${cellError(input.cell, true)}`) ||
    (cellError(input.cell2) && `Alternate cell: ${cellError(input.cell2)}`);
  if (bad) return { ok: false, error: bad };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      full_name: input.fullName.trim(),
      father_name: input.fatherName.trim() || null,
      cnic: input.cnic.trim() || null,
      cell: input.cell.trim(),
      cell2: input.cell2.trim() || null,
      address: input.address.trim() || null,
      area: input.area.trim() || null,
      occupation: input.occupation.trim() || null,
    })
    .eq("id", customerId);
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save the customer.") };
  refresh(customerId);
  return { ok: true };
}

/** Blacklisted customers can't get new installment sales (enforced in create_sale). */
export async function setBlacklistAction(customerId: string, blacklisted: boolean): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageEmployees) return { ok: false, error: "Only the owner or manager can blacklist a customer." };
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ blacklisted }).eq("id", customerId);
  if (error) return { ok: false, error: friendlyDbError(error) };
  refresh(customerId);
  return { ok: true };
}

/** Cancel a sale after collections started; optional refund is booked as money out. */
export async function cancelSaleAction(input: {
  customerId: string;
  agreementId: string;
  refund: number;
  account: MoneyAccount;
  reason: string;
  restock: boolean;
}): Promise<Result> {
  if (!(await getCurrentPermissions()).canManageEmployees) return { ok: false, error: "Only the owner or manager can cancel a sale." };
  if (!input.reason.trim()) return { ok: false, error: "Give a reason for cancelling." };
  if (!(input.refund >= 0)) return { ok: false, error: "The refund can't be negative." };
  if (!isMoneyAccount(input.account)) return { ok: false, error: "Choose the account the refund is paid from." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", {
    p_agreement: input.agreementId,
    p_refund: Math.round(input.refund),
    p_account: input.account,
    p_reason: input.reason,
    p_restock: input.restock,
  });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not cancel the sale.") };
  refresh(input.customerId);
  revalidatePath("/products");
  revalidatePath("/expenses");
  return { ok: true };
}
