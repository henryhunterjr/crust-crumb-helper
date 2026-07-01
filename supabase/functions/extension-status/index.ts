// Extension status webhook.
//
// The Chrome extension POSTs here after every DM attempt to update the
// corresponding outreach_sends row. Body:
//   { id: uuid, status: 'sent'|'failed'|'delivered'|'responded'|'skipped',
//     error?: string, externalId?: string }
//
// Auth: Bearer INGEST_API_KEY.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_KEY = Deno.env.get("INGEST_API_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const ALLOWED = new Set(["sent","failed","delivered","responded","skipped","canceled","queued"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  const auth = req.headers.get("authorization") || "";
  if (!INGEST_KEY || auth !== `Bearer ${INGEST_KEY}`) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const id = String(body.id || "").trim();
  const status = String(body.status || "").trim();
  if (!id || !ALLOWED.has(status)) {
    return json({ ok: false, error: "id and valid status required" }, 400);
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (body.error) patch.error = String(body.error).slice(0, 1000);
  if (body.externalId) patch.external_id = String(body.externalId).slice(0, 200);
  if (status === "sent" || status === "delivered") patch.sent_at = new Date().toISOString();
  if (status === "responded") patch.responded_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("outreach_sends")
    .update(patch)
    .eq("id", id)
    .select("id,status,member_id,channel")
    .maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!data) return json({ ok: false, error: "not found" }, 404);

  // Mirror onto the member row for quick counters.
  if (data.member_id && (status === "sent" || status === "delivered")) {
    await supabase
      .from("members")
      .update({
        outreach_sent: true,
        outreach_sent_at: new Date().toISOString(),
        last_business_touch: new Date().toISOString(),
      })
      .eq("id", data.member_id);
  }
  if (data.member_id && status === "responded") {
    await supabase.from("members").update({ outreach_responded: true }).eq("id", data.member_id);
  }

  return json({ ok: true, id: data.id, status: data.status });
});