"use server";

import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";

// queue_reminders (0010_edge_cases.sql) takes the amount from the live
// balance — never from the browser — skips customers with nothing due, sends
// a customer at most one reminder per day, and lets an AVO remind only their
// own customers.

export async function queueReminderAction(input: {
  customerId: string;
  monthLabel: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("queue_reminders", { p_customers: [input.customerId], p_month_label: input.monthLabel });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not queue the reminder.") };
  if (!data) return { ok: false, error: "Nothing due, or a reminder already went to this customer today." };
  return { ok: true };
}

export async function queueMonthRemindersAction(input: {
  customerIds: string[];
  monthLabel: string;
}): Promise<{ ok: true; count: number; skipped: number } | { ok: false; error: string }> {
  if (input.customerIds.length === 0) return { ok: true, count: 0, skipped: 0 };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("queue_reminders", { p_customers: input.customerIds, p_month_label: input.monthLabel });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not queue reminders.") };
  const count = Number(data ?? 0);
  return { ok: true, count, skipped: input.customerIds.length - count };
}
