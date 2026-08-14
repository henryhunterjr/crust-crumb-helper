import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-skooly-signature,x-skooly-timestamp",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeHandle(value: string | null) {
  return value?.replace(/^@/, "").trim().toLowerCase() || null;
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  const left = a.toLowerCase().replace(/^sha256=/, "");
  const right = b.toLowerCase().replace(/^sha256=/, "");
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

async function verifySignature(raw: string, timestamp: string, signature: string, secret: string) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() - seconds * 1000) > 5 * 60 * 1000) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`));
  return safeEqual(toHex(digest), signature);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("SKOOLY_WEBHOOK_SECRET");
  if (!secret) return json({ error: "Webhook is not configured" }, 503);

  const timestamp = req.headers.get("x-skooly-timestamp") || "";
  const signature = req.headers.get("x-skooly-signature") || "";
  const raw = await req.text();
  if (!signature || !(await verifySignature(raw, timestamp, signature, secret))) {
    return json({ error: "Invalid or stale signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const member = (payload.member && typeof payload.member === "object" ? payload.member : payload) as Record<string, unknown>;
  const eventType = readString(payload, ["event_type", "event", "type"]) || "unknown";
  const community = readString(payload, ["community_slug", "community", "group_slug"]);
  const name = readString(member, ["name", "full_name", "member_name"]);
  const handle = normalizeHandle(readString(member, ["handle", "username", "skool_username"]));
  const externalId = readString(payload, ["id", "event_id", "webhook_id"]);
  const eventKey = externalId || await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)).then(toHex);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: inserted, error: insertError } = await supabase
    .from("skooly_webhook_events")
    .insert({
      event_key: eventKey,
      event_type: eventType,
      community_slug: community,
      member_name: name,
      member_handle: handle,
      occurred_at: readString(payload, ["occurred_at", "created_at", "timestamp"]),
      payload,
    })
    .select("id")
    .single();

  if (insertError?.code === "23505") return json({ status: "duplicate", eventKey });
  if (insertError) return json({ error: "Unable to record event" }, 500);

  const isJoinEvent = ["new_member", "member.joined", "join_questions_answered", "member.join_answers"].includes(eventType);
  if (!isJoinEvent || (!name && !handle)) {
    await supabase.from("skooly_webhook_events").update({ processing_status: "ignored", processed_at: new Date().toISOString() }).eq("id", inserted.id);
    return json({ status: "ignored", eventKey });
  }

  const answers = payload.join_questions || payload.answers || member.join_questions || member.answers;
  const answerText = typeof answers === "string" ? answers : answers ? JSON.stringify(answers) : null;
  let query = supabase.from("members").select("id, communities").limit(1);
  query = handle ? query.eq("skool_username", handle) : query.ilike("skool_name", name!);
  const { data: existing } = await query.maybeSingle();
  const communities = Array.from(new Set([...(existing?.communities || []), ...(community ? [community] : [])]));

  const memberData = {
    skool_name: name || handle || "Unknown Skool member",
    skool_username: handle,
    application_answer: answerText,
    communities,
    roster_status: "on_roster",
    roster_last_seen_at: new Date().toISOString(),
  };

  const memberResult = existing?.id
    ? await supabase.from("members").update(memberData).eq("id", existing.id)
    : await supabase.from("members").insert({ ...memberData, message_status: "not_contacted", outreach_sent: false });

  await supabase.from("skooly_webhook_events").update({
    processing_status: memberResult.error ? "failed" : "processed",
    processed_at: new Date().toISOString(),
    error_message: memberResult.error?.message || null,
  }).eq("id", inserted.id);

  if (memberResult.error) return json({ error: "Member update failed", eventKey }, 500);
  return json({ status: "processed", eventKey });
});
