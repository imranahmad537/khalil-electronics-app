"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { getCurrentPermissions } from "@/lib/current-user";
import { shopTodayStr } from "@/lib/shop-time";

export interface ExpenseInput {
  category: string;
  description: string;
  amount: number;
  account: "cash_in_hand" | "meezan_bank" | "jazzcash";
  spentOn: string;
}

const FORBIDDEN = { ok: false as const, error: "Your role doesn't have access to expenses." };

export async function createExpenseAction(input: ExpenseInput): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageFinance) return FORBIDDEN;
  if (!input.category.trim()) return { ok: false, error: "Category is required." };
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount greater than zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.spentOn)) return { ok: false, error: "Choose the date of the expense." };
  if (input.spentOn > shopTodayStr()) return { ok: false, error: "The expense date can't be in the future." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("expenses").insert({
    category: input.category.trim(),
    description: input.description.trim() || null,
    amount: input.amount,
    account: input.account,
    spent_on: input.spentOn,
    created_by: user?.id ?? null,
  });

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/expenses");
  return { ok: true };
}

export async function updateExpenseAction(
  id: string,
  input: ExpenseInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canManageFinance) return FORBIDDEN;
  if (!input.category.trim()) return { ok: false, error: "Category is required." };
  if (!(input.amount > 0)) return { ok: false, error: "Enter an amount greater than zero." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.spentOn)) return { ok: false, error: "Choose the date of the expense." };
  if (input.spentOn > shopTodayStr()) return { ok: false, error: "The expense date can't be in the future." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({
      category: input.category.trim(),
      description: input.description.trim() || null,
      amount: input.amount,
      account: input.account,
      spent_on: input.spentOn,
    })
    .eq("id", id);

  if (error) return { ok: false, error: friendlyDbError(error) };
  revalidatePath("/expenses");
  return { ok: true };
}
