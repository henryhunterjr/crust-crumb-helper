// Bulk-send an outreach template to a segment.
//
// Creates queued rows in outreach_sends (channel-appropriate) with a 30-day
// dedupe (per template+recipient) and a hard 500/day cap per template. Actual
// delivery happens elsewhere: DM sends are picked up by the Chrome extension
// via /extension-queue, email sends are picked up by the existing Resend
// pipeline. This endpoint only enqueues + renders — never sends directly.
//
// Auth: Bearer INGEST_API_KEY (so Hermes/Claude and the admin UI can both hit
// it — the admin UI stores the same key in localStorage today).
//
// Body:
//   { templateKey: string, segmentKey?: string, triggeredBy?: 'ui'|'api'|'hermes',
//     triggeredByUser?: string, dryRun?: boolean, limit?: number }
//
// segmentKey defaults to the template's segment_key. limit caps this batch on
// top of the daily cap (useful for testing).

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

function renderTemplate(body: string, m: Record<string, unknown>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const parts = String(key).split(".");
    let cur: any = m;
    for (const p of parts) cur = cur?.[p];
    return cur == null ? "" : String(cur);
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
  const templateKey = String(body.templateKey || "").trim();
  if (!templateKey) return json({ ok: false, error: "templateKey required" }, 400);
  const triggeredBy = ["ui","api","hermes","system"].includes(body.triggeredBy) ? body.triggeredBy : "api";
  const triggeredByUser = body.triggeredByUser ? String(body.triggeredByUser).slice(0, 200) : null;
  const dryRun = body.dryRun === true;
  const requestedLimit = Number.isFinite(body.limit) ? Math.max(1, Math.min(1000, body.limit)) : 500;

  // Load template
  const { data: tpl, error: tplErr } = await supabase
    .from("outreach_templates")
    .select("id,key,name,channel,segment_key,subject,body,daily_cap,dedupe_days,is_active")
    .eq("key", templateKey)
    .maybeSingle();
  if (tplErr) return json({ ok: false, error: tplErr.message }, 500);
  if (!tpl) return json({ ok: false, error: `template ${templateKey} not found` }, 404);
  if (!tpl.is_active) return json({ ok: false, error: `template ${templateKey} is inactive` }, 400);

  const segmentKey = String(body.segmentKey || tpl.segment_key || "").trim();
  if (!segmentKey) return json({ ok: false, error: "segmentKey required (template has none)" }, 400);

  const dailyCap = tpl.daily_cap || 500;
  const dedupeDays = tpl.dedupe_days || 30;

  // Enforce 500/day hard ceiling on top of template's daily_cap.
  const effectiveDailyCap = Math.min(dailyCap, 500);

  // Count sends already created today for this template.
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("outreach_sends")
    .select("id", { count: "exact", head: true })
    .eq("template_id", tpl.id)
    .gte("created_at", since.toISOString());
  const remaining = Math.max(0, effectiveDailyCap - (sentToday || 0));
  if (remaining === 0) {
    return json({ ok: true, enqueued: 0, skipped_dedupe: 0, reason: "daily_cap_reached", cap: effectiveDailyCap });
  }
  const batchLimit = Math.min(requestedLimit, remaining);

  // Pull members in segment.
  const { data: candidates, error: memErr } = await supabase
    .from("members")
    .select("id,skool_name,first_name,email,skool_username,communities,segments,wingman_tags")
    .contains("segments", [segmentKey])
    .limit(2000);
  if (memErr) return json({ ok: false, error: memErr.message }, 500);

  // Dedupe: skip anyone who already got THIS template within dedupeDays.
  const cutoff = new Date(Date.now() - dedupeDays * 86_400_000).toISOString();
  const memberIds = (candidates || []).map((c) => c.id);
  const { data: recent } = await supabase
    .from("outreach_sends")
    .select("member_id")
    .eq("template_id", tpl.id)
    .in("member_id", memberIds.length ? memberIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("created_at", cutoff);
  const recentIds = new Set((recent || []).map((r) => r.member_id));

  const rows: any[] = [];
  let skipped = 0;
  for (const m of candidates || []) {
    if (recentIds.has(m.id)) { skipped++; continue; }
    // Channel-appropriate targeting.
    if (tpl.channel === "email" && !m.email) { skipped++; continue; }
    if (tpl.channel === "dm" && !m.skool_username) { skipped++; continue; }
    if (rows.length >= batchLimit) break;
    const mergeCtx = {
      first_name: m.first_name || (m.skool_name || "").split(" ")[0] || "there",
      name: m.skool_name || "",
      email: m.email || "",
      skool_username: m.skool_username || "",
    };
    rows.push({
      template_id: tpl.id,
      template_key: tpl.key,
      segment_key: segmentKey,
      channel: tpl.channel,
      member_id: m.id,
      recipient_email: m.email || null,
      recipient_skool_username: m.skool_username || null,
      recipient_name: m.skool_name || null,
      rendered_subject: tpl.subject ? renderTemplate(tpl.subject, mergeCtx) : null,
      rendered_body: renderTemplate(tpl.body || "", mergeCtx),
      status: "queued",
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser,
      batch_id: crypto.randomUUID(),
    });
  }

  if (dryRun) {
    return json({
      ok: true, dryRun: true, enqueued: 0, would_enqueue: rows.length,
      skipped_dedupe: skipped, cap_remaining: remaining, sample: rows.slice(0, 3),
    });
  }

  if (rows.length === 0) {
    return json({ ok: true, enqueued: 0, skipped_dedupe: skipped, cap_remaining: remaining });
  }

  // Assign one shared batch_id per call.
  const batchId = crypto.randomUUID();
  for (const r of rows) r.batch_id = batchId;

  const { error: insErr } = await supabase.from("outreach_sends").insert(rows);
  if (insErr) return json({ ok: false, error: insErr.message }, 500);

  return json({
    ok: true, enqueued: rows.length, skipped_dedupe: skipped,
    cap_remaining: remaining - rows.length, batch_id: batchId,
    template: tpl.key, segment: segmentKey, channel: tpl.channel,
  });
});