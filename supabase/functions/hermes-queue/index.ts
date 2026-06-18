import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");

function json(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (INGEST_API_KEY && token !== INGEST_API_KEY) return json({ error: "Unauthorized" }, 401);

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "generated";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const messageType = url.searchParams.get("message_type");

    let q = supabase
      .from("outreach_messages")
      .select("id, member_id, member_name, message_type, message_text, status, custom_topic, created_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (status !== "all") q = q.eq("status", status);
    if (messageType) q = q.eq("message_type", messageType);

    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, count: data?.length || 0, items: data });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});