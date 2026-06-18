import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function startOfIsoWeek(): string {
  const now = new Date();
  const day = now.getUTCDay() || 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - (day - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

// Crude next-run calculator. Supports the cron patterns we seed (min hour dow).
function nextRunFromCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const [minStr, hourStr, , , dowStr] = parts;
  const min = parseInt(minStr, 10) || 0;
  const hour = parseInt(hourStr, 10) || 0;
  const dows = dowStr === "*"
    ? [0, 1, 2, 3, 4, 5, 6]
    : dowStr.split(",").flatMap((s) => {
        const m = s.match(/^(\d+)-(\d+)$/);
        if (m) {
          const out: number[] = [];
          for (let i = parseInt(m[1]); i <= parseInt(m[2]); i++) out.push(i);
          return out;
        }
        const n = parseInt(s, 10);
        return isNaN(n) ? [] : [n];
      });
  const now = new Date();
  for (let offset = 0; offset < 14; offset++) {
    const cand = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset, hour, min, 0
    ));
    if (!dows.includes(cand.getUTCDay())) continue;
    if (cand.getTime() > now.getTime()) return cand.toISOString();
  }
  return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
}

async function newThreadsThisWeek(): Promise<number> {
  const since = startOfIsoWeek();
  const { count } = await supabase
    .from("outreach_messages")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since)
    .in("status", ["sent", "generated"]);
  return count || 0;
}

// ---------------- Job handlers ----------------

async function runWeeklyWelcomePost(dryRun: boolean) {
  const { data: members } = await supabase
    .from("members")
    .select("id, skool_name, skool_username, join_date, application_answer")
    .order("join_date", { ascending: false });
  const joiners = (members || []).filter((m) => daysSince(m.join_date) <= 7);
  const details: any = {
    joiners: joiners.map((m: any) => ({
      id: m.id,
      name: m.skool_name,
      username: m.skool_username,
      joined_days_ago: daysSince(m.join_date),
      has_goals: !!(m.application_answer || "").trim(),
    })),
  };

  if (joiners.length === 0) {
    return { status: "success", items_processed: 0, items_succeeded: 0, items_failed: 0,
      summary: "No new joiners this week. Nothing to draft.", details };
  }

  // Always generate the actual draft so the preview shows what would be posted.
  let draft = "";
  let aiUsed = false;
  if (LOVABLE_API_KEY) {
    const names = joiners.map((m) => m.skool_name).join(", ");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write community welcome posts in Henry Hunter Jr's voice: direct, confident, warm, no em dashes, no fluff words (ensure, dive, delve, enhance, crucial, tapestry, unveil). Plain text only. Under 120 words. Name each new member. End with one question that invites them to introduce themselves." },
          { role: "user", content: `Write a welcome post for these new Crust & Crumb Academy members: ${names}` },
        ],
      }),
    });
    if (aiRes.ok) {
      const data = await aiRes.json();
      draft = data?.choices?.[0]?.message?.content || "";
      aiUsed = !!draft;
    }
  }

  if (!draft) {
    draft = `Welcome to the new bakers this week: ${joiners.map((m) => m.skool_name).join(", ")}. Glad you're here. Drop a comment and tell us what you're working on.`;
  }

  details.draft_post = draft;
  details.ai_used = aiUsed;
  details.target = { page: "/outreach-queue", type: "welcome_post" };

  if (dryRun) {
    return { status: "success", items_processed: joiners.length, items_succeeded: 0, items_failed: 0,
      summary: `Preview only. Would draft a ${draft.length}-char welcome post for ${joiners.length} joiner(s).`, details };
  }

  const { error } = await supabase.from("outreach_messages").insert({
    member_id: joiners[0].id,
    member_name: "Weekly Welcome Post",
    message_type: "welcome_post",
    message_text: draft,
    status: "generated",
    priority: "high",
    custom_topic: `Welcome post for ${joiners.length} new members`,
  });
  if (error) {
    return { status: "failed", items_processed: joiners.length, items_succeeded: 0, items_failed: 1,
      summary: `Failed to save draft: ${error.message}`, details, error_message: error.message };
  }

  return { status: "success", items_processed: joiners.length, items_succeeded: 1, items_failed: 0,
    summary: `Drafted welcome post for ${joiners.length} joiner(s). Review in /outreach-queue.`, details };
}

async function runDailyReengagement(dryRun: boolean, config: any) {
  const dailyCap = Number(config?.dailyCap ?? 5);
  const weeklyThreadCap = Number(config?.weeklyThreadCap ?? 10);
  const usedThisWeek = await newThreadsThisWeek();
  const remaining = Math.max(0, weeklyThreadCap - usedThisWeek);
  const targetCount = Math.min(dailyCap, remaining);
  const details: any = { dailyCap, weeklyThreadCap, usedThisWeek, targetCount };

  if (targetCount === 0) {
    return { status: "success", items_processed: 0, items_succeeded: 0, items_failed: 0,
      summary: `Weekly thread cap reached (${usedThisWeek}/${weeklyThreadCap}). Skipping.`, details };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-welcome`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${Deno.env.get("INGEST_API_KEY") || SERVICE_KEY}`,
    },
    body: JSON.stringify({ newMemberDays: 0, backlogLimit: targetCount, dryRun }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { status: "failed", items_processed: 0, items_succeeded: 0, items_failed: 1,
      summary: `auto-welcome call failed: ${res.status}`, details: { ...details, body: text }, error_message: text };
  }

  const data = await res.json();
  details.autoWelcome = data;
  details.previews = Array.isArray(data?.results) ? data.results : [];
  details.target = { page: "/outreach-queue", type: "resource_recommendation" };
  const drafted = Number(data?.drafted || 0);
  return {
    status: "success",
    items_processed: Number(data?.candidates || 0),
    items_succeeded: drafted,
    items_failed: Number(data?.failed || 0),
    summary: dryRun
      ? `Preview only. Would draft ${data?.results?.length ?? 0} re-engagement DM(s).`
      : `Drafted ${drafted} re-engagement DM(s). Review in /outreach-queue.`,
    details,
  };
}

async function runWeeklyAnalyticsBrief(dryRun: boolean) {
  const weekEnd = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [membersRes, msgsRes] = await Promise.all([
    supabase.from("members").select("id, skool_name, engagement_status, join_date, last_active, post_count, comment_count"),
    supabase.from("outreach_messages").select("status, created_at, responded").gte("created_at", weekStart),
  ]);
  const members = membersRes.data || [];
  const msgs = msgsRes.data || [];
  const newMembers = members.filter((m: any) => m.join_date && m.join_date >= weekStart);
  const sent = msgs.filter((m: any) => m.status === "sent" || m.status === "replied").length;
  const replied = msgs.filter((m: any) => m.responded === true).length;
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  const atRisk = members.filter((m: any) => m.engagement_status === "at_risk").length;
  const inactive = members.filter((m: any) => m.engagement_status === "inactive").length;
  const atRiskList = members
    .filter((m: any) => m.engagement_status === "at_risk")
    .sort((a: any, b: any) => (a.last_active || "").localeCompare(b.last_active || ""))
    .slice(0, 5)
    .map((m: any) => ({ id: m.id, name: m.skool_name, last_active: m.last_active }));
  const topPoster = [...members]
    .sort((a: any, b: any) => (b.post_count || 0) - (a.post_count || 0))[0];

  const metrics = {
    weekStart, weekEnd,
    newMembers: newMembers.length,
    totalMembers: members.length,
    dmsSent: sent,
    dmsReplied: replied,
    replyRate,
    atRiskCount: atRisk,
    inactiveCount: inactive,
    atRiskTop5: atRiskList,
    topPoster: topPoster ? { id: topPoster.id, name: topPoster.skool_name, posts: topPoster.post_count } : null,
  };

  const details: any = { metrics };

  // Generate bullets in both modes so previews show what would be posted.
  let bullets = "";
  let aiUsed = false;
  if (LOVABLE_API_KEY) {
    const context = `New members: ${newMembers.length}\nDMs sent: ${sent}, replied: ${replied} (${replyRate}%)\nAt-risk: ${atRisk}, Inactive: ${inactive}\nAt-risk names: ${atRiskList.map((m: any) => m.name).join(", ")}\nTop poster: ${topPoster?.skool_name || "n/a"} (${topPoster?.post_count || 0} posts)`;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write weekly decision briefs in Henry Hunter Jr's voice: direct, confident, no em dashes, no fluff words. Output EXACTLY 5 bullets, no preamble, no closing. Bullet 1: one win. Bullet 2: one number that moved. Bullet 3: one member to personally re-engage (by name). Bullet 4: one content idea pulled from the data. Bullet 5: one thing to stop doing. Each bullet under 25 words. Plain text only." },
          { role: "user", content: context },
        ],
      }),
    });
    if (aiRes.ok) {
      const data = await aiRes.json();
      bullets = data?.choices?.[0]?.message?.content || "";
      aiUsed = !!bullets;
    }
  }

  if (!bullets) {
    bullets = `- Welcomed ${newMembers.length} new members this week.\n- Reply rate held at ${replyRate}%.\n- ${atRisk} members slipped to at-risk; pick the longest-quiet first.\n- Reuse the top topic from your most-commented post.\n- Stop sending DMs without a specific resource attached.`;
  }

  details.bullets = bullets;
  details.ai_used = aiUsed;
  details.target = { page: "/", type: "activity_feed" };

  if (dryRun) {
    return { status: "success", items_processed: 1, items_succeeded: 0, items_failed: 0,
      summary: "Preview only. Decision brief drafted but not posted.", details };
  }

  await supabase.from("activity_feed").insert({
    activity_type: "weekly_brief",
    title: `Weekly Decision Brief (${weekStart} → ${weekEnd})`,
    description: bullets,
  });

  return { status: "success", items_processed: 1, items_succeeded: 1, items_failed: 0,
    summary: "Posted 5-bullet decision brief to activity feed.", details };
}

async function runNewsletterStub(_dryRun: boolean) {
  return {
    status: "success",
    items_processed: 0,
    items_succeeded: 0,
    items_failed: 0,
    summary: "Newsletter draft job lands in Phase 3 (WordPress importer).",
    details: { pending: true },
  };
}

async function dispatch(job: any, dryRun: boolean) {
  switch (job.job_type) {
    case "weekly_welcome_post": return await runWeeklyWelcomePost(dryRun);
    case "daily_reengagement_dms": return await runDailyReengagement(dryRun, job.config);
    case "weekly_analytics_brief": return await runWeeklyAnalyticsBrief(dryRun);
    case "weekly_newsletter_draft": return await runNewsletterStub(dryRun);
    default: return { status: "failed", items_processed: 0, items_succeeded: 0, items_failed: 0,
      summary: `Unknown job_type: ${job.job_type}`, details: {}, error_message: "unknown job_type" };
  }
}

async function runJob(job: any, trigger: string, dryRun: boolean) {
  const startedAt = new Date();
  const { data: runRow, error: runErr } = await supabase.from("hermes_job_runs").insert({
    job_id: job.id, job_type: job.job_type, trigger, dry_run: dryRun, status: "running",
  }).select().single();
  if (runErr) throw runErr;

  let result: any;
  try {
    result = await dispatch(job, dryRun);
  } catch (err) {
    result = { status: "failed", items_processed: 0, items_succeeded: 0, items_failed: 1,
      summary: "Handler threw", details: {}, error_message: err instanceof Error ? err.message : String(err) };
  }

  const finishedAt = new Date();
  await supabase.from("hermes_job_runs").update({
    status: result.status,
    items_processed: result.items_processed,
    items_succeeded: result.items_succeeded,
    items_failed: result.items_failed,
    summary: result.summary,
    details: result.details,
    error_message: result.error_message || null,
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
  }).eq("id", runRow.id);

  if (!dryRun) {
    await supabase.from("hermes_jobs").update({
      last_run_at: finishedAt.toISOString(),
      last_run_status: result.status,
      last_run_summary: result.summary,
      next_run_at: nextRunFromCron(job.schedule_cron),
    }).eq("id", job.id);
  }

  return { run_id: runRow.id, ...result };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const trigger = body.trigger || "cron";

    // Cron tick: run all due, enabled jobs.
    if (trigger === "cron" || !body.job_id) {
      const { data: jobs } = await supabase
        .from("hermes_jobs")
        .select("*")
        .eq("enabled", true)
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);
      const results: any[] = [];
      for (const job of jobs || []) {
        results.push({ job_type: job.job_type, ...(await runJob(job, "cron", false)) });
      }
      return json({ ok: true, ran: results.length, results });
    }

    // Manual run or preview.
    const { data: job, error } = await supabase
      .from("hermes_jobs").select("*").eq("id", body.job_id).single();
    if (error || !job) return json({ error: "Job not found" }, 404);
    const result = await runJob(job, trigger, body.dry_run === true);
    return json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("hermes-run error:", msg);
    return json({ error: msg }, 500);
  }
});