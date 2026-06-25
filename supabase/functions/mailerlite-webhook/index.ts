import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-mailerlite-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time-ish compare
  if (hex.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) {
    diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

function extractEvent(payload: any) {
  // MailerLite v2 webhook shape: { events: [ { id, type, data: {...} } ] }
  // Also tolerate single-event { type, data } payloads.
  const events: any[] = Array.isArray(payload?.events)
    ? payload.events
    : payload?.type
      ? [payload]
      : [];
  return events.map((e) => {
    const data = e.data ?? {};
    const subscriber = data.subscriber ?? data;
    return {
      event_id: String(e.id ?? e.event_id ?? `${e.type}-${subscriber?.email}-${data.timestamp ?? Date.now()}`),
      event_type: String(e.type ?? "unknown"),
      email: (subscriber?.email ?? data.email ?? "").toString().toLowerCase().trim(),
      campaign_id: data.campaign?.id ? String(data.campaign.id) : null,
      raw: e,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const secret = Deno.env.get("MAILERLITE_WEBHOOK_SECRET");
  if (!secret) {
    return json(503, { error: "webhook_secret_not_configured" });
  }

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-mailerlite-signature") ??
    req.headers.get("signature");

  const ok = await verifySignature(rawBody, signature, secret);
  if (!ok) {
    return json(401, { error: "invalid_signature" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const events = extractEvent(payload);
  if (events.length === 0) {
    return json(200, { ok: true, processed: 0 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Array<{ event_id: string; status: string; note?: string }> = [];

  for (const ev of events) {
    // Idempotency: insert event row; ignore conflict on event_id.
    const { data: inserted, error: insertErr } = await supabase
      .from("nurture_events")
      .insert({
        event_id: ev.event_id,
        event_type: ev.event_type,
        subscriber_email: ev.email || null,
        campaign_id: ev.campaign_id,
        payload: ev.raw,
      })
      .select("id")
      .maybeSingle();

    if (insertErr) {
      // Unique violation on event_id => duplicate retry, skip processing.
      if ((insertErr as any).code === "23505") {
        results.push({ event_id: ev.event_id, status: "duplicate" });
        continue;
      }
      results.push({
        event_id: ev.event_id,
        status: "insert_failed",
        note: insertErr.message,
      });
      continue;
    }

    if (!ev.email) {
      await supabase
        .from("nurture_events")
        .update({ processed: true, process_error: "no_email" })
        .eq("id", inserted!.id);
      results.push({ event_id: ev.event_id, status: "no_email" });
      continue;
    }

    // Match member by lowercase email.
    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id, business_touch_count, status, nurture_status")
      .ilike("email", ev.email)
      .maybeSingle();

    if (memberErr) {
      await supabase
        .from("nurture_events")
        .update({ processed: false, process_error: memberErr.message })
        .eq("id", inserted!.id);
      results.push({ event_id: ev.event_id, status: "member_lookup_failed" });
      continue;
    }

    if (!member) {
      await supabase
        .from("nurture_events")
        .update({ processed: true, process_error: "member_not_found" })
        .eq("id", inserted!.id);
      results.push({ event_id: ev.event_id, status: "member_not_found" });
      continue;
    }

    // Skip customers entirely.
    if (member.status === "enrolled") {
      await supabase
        .from("nurture_events")
        .update({ processed: true, process_error: "skipped_enrolled", member_id: member.id })
        .eq("id", inserted!.id);
      results.push({ event_id: ev.event_id, status: "skipped_enrolled" });
      continue;
    }

    const type = ev.event_type.toLowerCase();
    const updates: Record<string, unknown> = {};

    if (type.includes("sent") || type === "campaign.sent" || type === "subscriber.sent") {
      updates.last_business_touch = new Date().toISOString();
      updates.business_touch_count = (member.business_touch_count ?? 0) + 1;
    } else if (
      type.includes("unsubscribe") ||
      type === "subscriber.unsubscribed"
    ) {
      updates.nurture_status = "opted_out";
    }
    // open / click events are logged but don't currently mutate member state.

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from("members")
        .update(updates)
        .eq("id", member.id);
      if (updErr) {
        await supabase
          .from("nurture_events")
          .update({
            processed: false,
            process_error: updErr.message,
            member_id: member.id,
          })
          .eq("id", inserted!.id);
        results.push({ event_id: ev.event_id, status: "member_update_failed" });
        continue;
      }
    }

    await supabase
      .from("nurture_events")
      .update({ processed: true, member_id: member.id })
      .eq("id", inserted!.id);

    results.push({ event_id: ev.event_id, status: "ok" });
  }

  return json(200, { ok: true, processed: results.length, results });
});