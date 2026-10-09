// Drains `messages` where status='queued' (see supabase/migrations/0005_messaging.sql
// for what queues rows, and the `on_receipt_msg` trigger in 0002_billing.sql).
// Invoke on a schedule (Supabase Dashboard > Edge Functions > Cron, or pg_cron
// calling net.http_post against this function's URL) — a few times a day is
// plenty for this business.
//
// WhatsApp: `messages.body` is already a fully-rendered string (the queueing
// functions substitute {{name}}/{{amount}}/{{month}} at insert time — that's
// the schema's existing design, see message_templates). This sends it as a
// plain "text" message via the Meta Cloud API, which only delivers (a) inside
// a 24h window after the customer last messaged the business number, or (b)
// if your WhatsApp Business account has an applicable exemption. For
// business-initiated outreach outside that window, Meta requires a
// *pre-approved template* with its own {{1}}, {{2}}... placeholders instead
// of free text — if that's your setup, swap sendWhatsApp's body below for a
// `type: "template"` payload referencing your approved template name and
// pass {{name}}/{{amount}}/{{month}} as separate component parameters rather
// than the pre-rendered string.
//
// SMS: posts to a generic {to, message} JSON endpoint. Adjust to your actual
// gateway's contract — "a local gateway" isn't a specific vendor.

import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

interface QueuedMessage {
  id: string;
  customer_id: string;
  channel: "whatsapp" | "sms";
  body: string;
  customers: { cell: string; full_name: string } | null;
}

async function sendWhatsApp(cell: string, body: string): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return { ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured" };

  const to = cell.replace(/[^0-9]/g, "");
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}` };
  return { ok: true, providerId: json?.messages?.[0]?.id };
}

async function sendSms(cell: string, body: string): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const gatewayUrl = Deno.env.get("SMS_GATEWAY_URL");
  if (!gatewayUrl) return { ok: false, error: "SMS_GATEWAY_URL not configured" };

  const apiKey = Deno.env.get("SMS_GATEWAY_API_KEY");
  const res = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ to: cell, message: body }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error ?? `HTTP ${res.status}` };
  return { ok: true, providerId: json?.id };
}

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (_req, ctx) => {
    const { data: queued, error } = await ctx.supabaseAdmin
      .from("messages")
      .select("id, customer_id, channel, body, customers(cell, full_name)")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of (queued ?? []) as unknown as QueuedMessage[]) {
      const cell = msg.customers?.cell;
      if (!cell) {
        await ctx.supabaseAdmin.from("messages").update({ status: "failed" }).eq("id", msg.id);
        failed++;
        continue;
      }

      const result = msg.channel === "whatsapp" ? await sendWhatsApp(cell, msg.body) : await sendSms(cell, msg.body);

      if (result.ok) {
        await ctx.supabaseAdmin
          .from("messages")
          .update({ status: "sent", provider_id: result.providerId ?? null, sent_at: new Date().toISOString() })
          .eq("id", msg.id);
        sent++;
      } else {
        console.error(`send-messages: ${msg.channel} to ${cell} failed: ${result.error}`);
        await ctx.supabaseAdmin.from("messages").update({ status: "failed" }).eq("id", msg.id);
        failed++;
      }
    }

    return Response.json({ ok: true, processed: (queued ?? []).length, sent, failed });
  }),
};

/* To invoke locally:

  1. Run `supabase start`
  2. Set WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / SMS_GATEWAY_URL in supabase/functions/.env
     (or `supabase secrets set` for a linked hosted project)
  3. curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-messages' \
       --header 'apiKey: <service_role_key>'

*/
