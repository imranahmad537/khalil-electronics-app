"use server";

import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/money";

export async function queueReminderAction(input: {
  customerId: string;
  amount: number;
  monthLabel: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const [{ data: customer, error: custError }, { data: template, error: tplError }] = await Promise.all([
    supabase.from("customers").select("full_name").eq("id", input.customerId).single(),
    supabase.from("message_templates").select("body, channel").eq("key", "reminder").single(),
  ]);

  if (custError || !customer) return { ok: false, error: custError?.message ?? "Customer not found" };
  if (tplError || !template) return { ok: false, error: tplError?.message ?? "Template not found" };

  const body = template.body
    .replaceAll("{{name}}", customer.full_name)
    .replaceAll("{{amount}}", money(input.amount).replace("Rs ", ""))
    .replaceAll("{{month}}", input.monthLabel);

  const { error } = await supabase.from("messages").insert({
    customer_id: input.customerId,
    channel: template.channel,
    template: "reminder",
    body,
    status: "queued" as const,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function queueMonthRemindersAction(input: {
  customers: { customerId: string; name: string; amount: number }[];
  monthLabel: string;
}): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (input.customers.length === 0) return { ok: true, count: 0 };

  const supabase = await createClient();
  const { data: template, error: tplError } = await supabase
    .from("message_templates")
    .select("body, channel")
    .eq("key", "reminder")
    .single();

  if (tplError || !template) return { ok: false, error: tplError?.message ?? "Template not found" };

  const rows = input.customers.map((c) => ({
    customer_id: c.customerId,
    channel: template.channel,
    template: "reminder",
    body: template.body
      .replaceAll("{{name}}", c.name)
      .replaceAll("{{amount}}", money(c.amount).replace("Rs ", ""))
      .replaceAll("{{month}}", input.monthLabel),
    status: "queued" as const,
  }));

  const { error } = await supabase.from("messages").insert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true, count: rows.length };
}
