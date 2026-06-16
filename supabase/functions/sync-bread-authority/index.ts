import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSyncBatches, type CacheEntry, type ContentTable, type Topic } from "../_shared/bread-authority.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");
const BASE = (Deno.env.get("BREAD_AUTHORITY_BASE_URL") || "https://bakinggreatbread.com/library-cache").replace(/\/$/, "");
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
async function fetchJson(url: string): Promise<unknown> { const res = await fetch(url, { headers: { accept: "application/json" } }); if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`); return res.json(); }
function asArray(v: unknown): unknown[] { if (Array.isArray(v)) return v; if (v && typeof v === "object") { const o = v as Record<string, unknown>; if (Array.isArray(o.topics)) return o.topics; if (Array.isArray(o.items)) return o.items; } return []; }

const TABLES: ContentTable[] = ["youtube_videos", "recipes", "blog_posts", "classroom_resources"];

async function countBySource(table: ContentTable, source = "bread-authority"): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("source", source);
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return count ?? 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return json({ error: "Missing authorization header" }, 401);
  if (INGEST_API_KEY && auth.replace("Bearer ", "") !== INGEST_API_KEY) return json({ error: "Invalid API key" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const dryRun = body.dryRun === true;

  const startedAt = Date.now();
  const runInsert = await supabase.from("sync_runs").insert({
    source: "bread-authority", status: "running", dry_run: dryRun,
  }).select("id").single();
  const runId = runInsert.data?.id as string | undefined;

  const beforeCounts: Record<string, number> = {};
  for (const t of TABLES) { try { beforeCounts[t] = await countBySource(t); } catch { beforeCounts[t] = 0; } }

  try {
    const manifest = asArray(await fetchJson(`${BASE}/_topics-manifest.json`)) as Topic[];
    if (manifest.length === 0) return json({ error: "Empty or unreadable topics manifest" }, 502);
    const pairs: Array<{ entry: CacheEntry; topic: Topic }> = [];
    const topicErrors: string[] = [];
    for (const topic of manifest) {
      if (!topic.slug) continue;
      try { const items = asArray(await fetchJson(`${BASE}/${topic.slug}.json`)) as CacheEntry[]; for (const entry of items) pairs.push({ entry, topic }); }
      catch (e) { topicErrors.push(`${topic.slug}: ${(e as Error).message}`); }
    }
    const batches = buildSyncBatches(pairs);
    const tables = TABLES;
    const TITLE_UNIQUE = new Set<ContentTable>(["recipes", "classroom_resources"]);
    const counts: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    for (const table of tables) {
      let rows = batches[table];
      if (rows.length === 0) { counts[table] = 0; continue; }
      if (!dryRun) {
        const { error: delErr } = await supabase.from(table).delete().eq("source", "bread-authority");
        if (delErr) throw new Error(`delete ${table}: ${delErr.message}`);
      }
      if (TITLE_UNIQUE.has(table)) {
        const existing = new Set<string>();
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase.from(table).select("title").range(from, from + 999);
          if (error) throw new Error(`titles ${table}: ${error.message}`);
          for (const r of (data || [])) existing.add(String((r as Record<string, unknown>).title || "").toLowerCase().trim());
          if (!data || data.length < 1000) break;
        }
        const before = rows.length;
        rows = rows.filter((r) => !existing.has(String(r.title || "").toLowerCase().trim()));
        skipped[table] = before - rows.length;
      }
      let inserted = 0;
      if (dryRun) {
        inserted = rows.length;
      } else {
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error: insErr } = await supabase.from(table).insert(chunk);
          if (insErr) throw new Error(`insert ${table}: ${insErr.message}`);
          inserted += chunk.length;
        }
      }
      counts[table] = inserted;
    }

    const afterCounts: Record<string, number> = {};
    for (const t of TABLES) { try { afterCounts[t] = dryRun ? beforeCounts[t] : await countBySource(t); } catch { afterCounts[t] = beforeCounts[t]; } }
    const deltas: Record<string, { before: number; after: number; delta: number }> = {};
    for (const t of TABLES) deltas[t] = { before: beforeCounts[t], after: afterCounts[t], delta: afterCounts[t] - beforeCounts[t] };

    if (runId) {
      await supabase.from("sync_runs").update({
        status: "completed",
        topics_seen: manifest.length,
        entries_seen: pairs.length,
        inserted: counts,
        skipped,
        deltas,
        topic_errors: topicErrors,
        duration_ms: Date.now() - startedAt,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    return json({ status: "completed", runId, dryRun, topics: manifest.length, entriesSeen: pairs.length, inserted: counts, skippedExistingTitle: skipped, deltas, topicErrors });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-bread-authority error:", message);
    if (runId) {
      await supabase.from("sync_runs").update({
        status: "failed", error_message: message,
        duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return json({ error: "Sync failed", detail: message }, 500);
  }
});