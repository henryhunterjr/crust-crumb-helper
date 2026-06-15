// Crust & Crumb Helper — Bread Authority sync (P1)
// POST https://{PROJECT_REF}.supabase.co/functions/v1/sync-bread-authority
//
// Pulls Henry's real Bread Authority library from the public static cache and
// loads it into the Helper's content tables, so generate-dm recommends from
// the full catalog with real URLs. Re-runnable: it replaces only rows tagged
// source='bread-authority', leaving hand-added rows alone. Meant to run on a
// schedule alongside the roster read.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildSyncBatches,
  type CacheEntry,
  type ContentTable,
  type Topic,
} from "../_shared/bread-authority.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");
const BASE = (Deno.env.get("BREAD_AUTHORITY_BASE_URL") ||
  "https://bakinggreatbread.com/library-cache").replace(/\/$/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.json();
}

function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.topics)) return o.topics;
    if (Array.isArray(o.items)) return o.items;
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return json({ error: "Missing authorization header" }, 401);
  if (INGEST_API_KEY && auth.replace("Bearer ", "") !== INGEST_API_KEY) {
    return json({ error: "Invalid API key" }, 403);
  }

  try {
    // 1. Topics manifest, then each topic file.
    const manifest = asArray(await fetchJson(`${BASE}/_topics-manifest.json`)) as Topic[];
    if (manifest.length === 0) return json({ error: "Empty or unreadable topics manifest" }, 502);

    const pairs: Array<{ entry: CacheEntry; topic: Topic }> = [];
    const topicErrors: string[] = [];
    for (const topic of manifest) {
      if (!topic.slug) continue;
      try {
        const items = asArray(await fetchJson(`${BASE}/${topic.slug}.json`)) as CacheEntry[];
        for (const entry of items) pairs.push({ entry, topic });
      } catch (e) {
        topicErrors.push(`${topic.slug}: ${(e as Error).message}`);
      }
    }

    const batches = buildSyncBatches(pairs);

    // 2. Replace this source's rows table by table. Empty batch is treated as a
    //    failed pull and skipped, so a bad fetch never wipes a table.
    const tables: ContentTable[] = ["youtube_videos", "recipes", "blog_posts", "classroom_resources"];
    // recipes and classroom_resources have a UNIQUE(title) constraint, so a
    // Bread Authority title that already exists as a hand-added row must be
    // skipped rather than inserted.
    const TITLE_UNIQUE = new Set<ContentTable>(["recipes", "classroom_resources"]);
    const counts: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    for (const table of tables) {
      let rows = batches[table];
      if (rows.length === 0) { counts[table] = 0; continue; }
      const { error: delErr } = await supabase.from(table).delete().eq("source", "bread-authority");
      if (delErr) throw new Error(`delete ${table}: ${delErr.message}`);

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
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error: insErr } = await supabase.from(table).insert(chunk);
        if (insErr) throw new Error(`insert ${table}: ${insErr.message}`);
        inserted += chunk.length;
      }
      counts[table] = inserted;
    }

    return json({
      status: "completed",
      topics: manifest.length,
      entriesSeen: pairs.length,
      inserted: counts,
      skippedExistingTitle: skipped,
      topicErrors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sync-bread-authority error:", message);
    return json({ error: "Sync failed", detail: message }, 500);
  }
});
