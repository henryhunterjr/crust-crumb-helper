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

const ALLOWED = new Set(["sent", "skipped", "failed", "generated"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (INGEST_API_KEY && token !== INGEST_API_KEY) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    const status: string = body.status || "sent";
    if (!ids.length) return json({ error: "ids required" }, 400);
    if (!ALLOWED.has(status)) return json({ error: `status must be one of ${[...ALLOWED].join(", ")}` }, 400);

    const update: Record<string, unknown> = { status };
    if (status === "sent") update.sent_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("outreach_messages")
      .update(update)
      .in("id", ids)
      .select("id, status, sent_at");
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, updated: data?.length || 0, items: data });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});