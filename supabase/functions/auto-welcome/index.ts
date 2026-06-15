// Crust & Crumb Helper — Auto-welcome (P1)
// POST https://{PROJECT_REF}.supabase.co/functions/v1/auto-welcome
//
// Drafts a personalized message for each current member who has a join answer
// and has never been contacted, and queues it for one-tap approval (review-
// then-send). New joiners get a true welcome; older members get a check-in
// framed as a recommendation, not a late "welcome". Nothing is sent here: rows
// land in outreach_messages with status='generated' for Henry to approve.
//
// Body (all optional):
//   { newMemberDays=7, backlogLimit=20, dryRun=false, memberIds?: string[] }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

async function fetchCandidates(memberIds?: string[]) {
  // Members on the roster, with a non-empty answer, never contacted.
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    let q = supabase
      .from("members")
      .select("id, skool_name, skool_username, join_date, application_answer, post_count, comment_count, last_active, engagement_status, message_status, outreach_sent, roster_status")
      .eq("roster_status", "on_roster")
      .eq("message_status", "not_contacted")
      .eq("outreach_sent", false)
      .not("application_answer", "is", null)
      .range(from, from + pageSize - 1);
    if (memberIds && memberIds.length) q = q.in("id", memberIds);
    const { data, error } = await q;
    if (error) throw error;
    const batch = (data || []).filter((m: any) => (m.application_answer || "").trim().length > 0);
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return all.filter((m: any) => (m.application_answer || "").trim().length > 0);
}

async function generateDm(member: any, outreachType: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-dm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ member, outreach_type: outreachType }),
  });
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return json({ error: "Missing authorization header" }, 401);
  if (INGEST_API_KEY && auth.replace("Bearer ", "") !== INGEST_API_KEY) {
    return json({ error: "Invalid API key" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const newMemberDays = Number(body.newMemberDays ?? 7);
  const backlogLimit = Number(body.backlogLimit ?? 20);
  const dryRun = body.dryRun === true;
  const memberIds: string[] | undefined = Array.isArray(body.memberIds) ? body.memberIds : undefined;

  try {
    const candidates = await fetchCandidates(memberIds);

    // Newest first, split into new joiners vs older backlog.
    candidates.sort((a, b) => daysSince(a.join_date) - daysSince(b.join_date));
    const newJoiners = candidates.filter((m) => daysSince(m.join_date) <= newMemberDays);
    const backlog = candidates.filter((m) => daysSince(m.join_date) > newMemberDays).slice(0, backlogLimit);
    const toProcess = [...newJoiners, ...backlog];

    const results: any[] = [];
    let drafted = 0, welcomed = 0, checkedIn = 0, failed = 0, stopped = false;

    for (const member of toProcess) {
      const isNew = daysSince(member.join_date) <= newMemberDays;
      const outreachType = isNew ? "welcome_message" : "resource_recommendation";
      const res = await generateDm(member, outreachType);

      if (res.status === 429 || res.status === 402) {
        stopped = true; // rate/credit limit — stop gracefully, leave the rest for next run
        break;
      }
      if (!res.ok) { failed++; continue; }
      const data = await res.json();
      const message: string = data.message || "";
      if (!message.trim()) { failed++; continue; }

      results.push({
        member: member.skool_name,
        type: outreachType,
        joinedDaysAgo: daysSince(member.join_date),
        matched: [...(data.matched_videos || []), ...(data.matched_recipes || []), ...(data.matched_resources || []), ...(data.matched_blog_posts || [])].slice(0, 3),
        preview: message.slice(0, 200),
      });

      if (!dryRun) {
        const { error: insErr } = await supabase.from("outreach_messages").insert({
          member_id: member.id,
          member_name: member.skool_name,
          message_type: outreachType,
          message_text: message,
          status: "generated",
          priority: isNew ? "high" : "medium",
          engagement_status_at_send: member.engagement_status || "unknown",
        });
        if (insErr) { failed++; continue; }
        await supabase.from("members").update({ message_status: "message_generated" }).eq("id", member.id);
      }
      drafted++;
      if (isNew) welcomed++; else checkedIn++;
    }

    if (!dryRun && drafted > 0) {
      await supabase.from("activity_feed").insert({
        activity_type: "auto_welcome",
        title: `Auto-welcome drafted ${drafted} message${drafted === 1 ? "" : "s"} for review`,
        description: `${welcomed} new-member welcome(s), ${checkedIn} backlog check-in(s)${stopped ? " (stopped early on rate limit)" : ""}`,
      });
    }

    return json({
      status: "completed",
      dryRun,
      candidates: candidates.length,
      newJoiners: newJoiners.length,
      backlogConsidered: backlog.length,
      drafted, welcomed, checkedIn, failed,
      stoppedOnRateLimit: stopped,
      results: dryRun ? results : results.slice(0, 5),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("auto-welcome error:", message);
    return json({ error: "Auto-welcome failed", detail: message }, 500);
  }
});
