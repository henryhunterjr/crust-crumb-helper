import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

type ContentTable = "youtube_videos" | "recipes" | "blog_posts" | "classroom_resources";
const TABLES: ContentTable[] = ["youtube_videos", "recipes", "blog_posts", "classroom_resources"];
const STALE_HOURS = 24 * 7;

async function countAll(table: ContentTable): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}
async function countBySource(table: ContentTable, source: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("source", source);
  if (error) throw new Error(`count ${table} source=${source}: ${error.message}`);
  return count ?? 0;
}
async function countMissingSource(table: ContentTable): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).is("source", null);
  if (error) throw new Error(`missing-source ${table}: ${error.message}`);
  return count ?? 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return json({ error: "Missing authorization header" }, 401);
  if (INGEST_API_KEY && auth.replace("Bearer ", "") !== INGEST_API_KEY) return json({ error: "Invalid API key" }, 403);
  try {
    const tables: Record<string, { total: number; bread_authority: number; manual: number; missing_source: number }> = {};
    const issues: string[] = [];
    for (const t of TABLES) {
      const [total, ba, manual, missing] = await Promise.all([
        countAll(t), countBySource(t, "bread-authority"), countBySource(t, "manual"), countMissingSource(t),
      ]);
      tables[t] = { total, bread_authority: ba, manual, missing_source: missing };
      if (missing > 0) issues.push(`${t}: ${missing} rows have NULL source`);
      if (total === 0) issues.push(`${t}: empty table`);
    }

    const { data: lastRunRows } = await supabase.from("sync_runs")
      .select("id, status, finished_at, started_at, duration_ms, inserted, deltas, topic_errors")
      .eq("source", "bread-authority").eq("status", "completed").eq("dry_run", false)
      .order("finished_at", { ascending: false }).limit(1);
    const lastRun = lastRunRows?.[0] ?? null;

    const lastSyncAt: string | null = (lastRun?.finished_at as string | null) ?? null;
    let staleSync = false;
    if (lastSyncAt) {
      const ageHours = (Date.now() - new Date(lastSyncAt).getTime()) / 3_600_000;
      if (ageHours > STALE_HOURS) {
        staleSync = true;
        issues.push(`Last successful sync is ${ageHours.toFixed(1)}h old (threshold ${STALE_HOURS}h)`);
      }
    } else {
      issues.push("No successful sync recorded yet");
    }

    const ok = issues.length === 0;
    return json({ ok, checkedAt: new Date().toISOString(), tables, lastSync: lastRun, lastSyncAt, staleSync, issues });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("library-health error:", message);
    return json({ error: "Health check failed", detail: message }, 500);
  }
});