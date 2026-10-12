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

interface ClaimedMessage {
  id: string;
  channel: "whatsapp" | "sms";
  body: string;
  cell: string | null;
}

/**
 * Pakistani mobiles are stored as 03XX-XXXXXXX; WhatsApp and SMS gateways
 * need international format without "+": 923XXXXXXXXX. Returns null for
 * anything that isn't a valid Pakistani mobile, so it fails visibly instead
 * of going to a wrong number.
 */
export function toInternational(cell: string): string | null {
  const d = cell.replace(/\D/g, "");
  if (/^03\d{9}$/.test(d)) return "92" + d.slice(1);
  if (/^923\d{9}$/.test(d)) return d;
  if (/^00923\d{9}$/.test(d)) return d.slice(2);
  return null;
}

async function sendWhatsApp(cell: string, body: string): Promise<{ ok: boolean; providerId?: string; error?: string }> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return { ok: false, error: "WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured" };

  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cell,
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
    // claim_queued_messages (0010_edge_cases.sql) locks this batch so an
    // overlapping run can't send the same message twice.
    const { data: claimed, error } = await ctx.supabaseAdmin.rpc("claim_queued_messages", { p_limit: 100 });
    if (error) {
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of (claimed ?? []) as ClaimedMessage[]) {
      const to = msg.cell ? toInternational(msg.cell) : null;
      const result = !to
        ? { ok: false, error: `Invalid or missing mobile number: ${msg.cell ?? "none"}` }
        : msg.channel === "whatsapp"
          ? await sendWhatsApp(to, msg.body)
          : await sendSms(to, msg.body);

      // sent, or back in the queue (retried up to 3 times), or failed — with the reason saved
      await ctx.supabaseAdmin.rpc("finish_message", {
        p_id: msg.id,
        p_ok: result.ok,
        p_provider_id: result.ok ? (result.providerId ?? null) : null,
        p_error: result.ok ? null : (result.error ?? "unknown error"),
      });
      if (result.ok) sent++;
      else {
        console.error(`send-messages: ${msg.channel} to ${msg.cell} failed: ${result.error}`);
        failed++;
      }
    }

    return Response.json({ ok: true, processed: (claimed ?? []).length, sent, failed });
  }),
};

/* To invoke locally:

  1. Run `supabase start`
  2. Set WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / SMS_GATEWAY_URL in supabase/functions/.env
     (or `supabase secrets set` for a linked hosted project)
  3. curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-messages' \
       --header 'apiKey: <service_role_key>'

*/
