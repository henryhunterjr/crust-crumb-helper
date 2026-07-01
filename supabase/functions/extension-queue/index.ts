// Extension queue endpoint.
//
// GET  -> returns up to N queued DM sends for the Chrome extension to work
//         through. Marks them as 'sending' so a second poll won't hand out
//         the same rows. The extension must POST to /extension-status to
//         resolve each one (sent | failed).
//
// Auth: Bearer INGEST_API_KEY. The extension already stores this key in
// chrome.storage (settings screen).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_KEY = Deno.env.get("INGEST_API_KEY") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

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

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || "10")));
  const claim = url.searchParams.get("claim") !== "false"; // default true

  // Grab oldest queued DM sends first.
  const { data: queued, error } = await supabase
    .from("outreach_sends")
    .select("id,template_key,recipient_skool_username,recipient_name,rendered_body,queued_at,attempts")
    .eq("channel", "dm")
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(limit);
  if (error) return json({ ok: false, error: error.message }, 500);

  if (claim && queued && queued.length) {
    const ids = queued.map((r) => r.id);
    await supabase
      .from("outreach_sends")
      .update({ status: "sending", attempts: (queued[0].attempts || 0) + 1 })
      .in("id", ids);
  }

  return json({ ok: true, count: queued?.length || 0, items: queued || [] });
});