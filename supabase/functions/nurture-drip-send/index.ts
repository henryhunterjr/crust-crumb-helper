// Crust & Crumb Helper — nurture-drip-send
//
// Daily drip runner. Sends the next step in the market-curious sequence to
// eligible members via Resend. Throttled to MAX_PER_RUN per invocation.
//
// Eligibility:
//   intent_tier IN (curious, prospect)
//   AND nurture_status = 'active'  (excludes 'customer'/'opted_out'/'paused')
//   AND email IS NOT NULL
//   AND (nurture_step = 0
//        OR (nurture_step < 6 AND last_business_touch <= now() - interval '5 days'))
//
// Triggered by: existing scheduled task pattern (pg_cron POST), or manually
// via supabase.functions.invoke('nurture-drip-send', { body: { dryRun: true } })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  getNurtureEmail,
  renderNurtureEmail,
  MAX_NURTURE_STEP,
} from "../_shared/nurture-emails.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NURTURE_FROM_EMAIL =
  Deno.env.get("NURTURE_FROM_EMAIL") ||
  "Henry <henry@fromoventomarket.com>";
const NURTURE_REPLY_TO =
  Deno.env.get("NURTURE_REPLY_TO") || "henry@fromoventomarket.com";

const MAX_PER_RUN = 50;
const COOLDOWN_DAYS = 5;
/** Hard launch gate. Nothing sends before this instant. */
const LAUNCH_AT = new Date("2026-06-29T13:00:00Z");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function firstName(skoolName: string | null): string {
  if (!skoolName) return "there";
  const trimmed = skoolName.trim().split(/\s+/)[0];
  return trimmed || "there";
}

/** 32-byte URL-safe random token. No HMAC needed since the table is the source of truth. */
function newUnsubscribeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function ensureUnsubscribeToken(memberId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const token = newUnsubscribeToken();
  const { error } = await supabase
    .from("members")
    .update({ unsubscribe_token: token })
    .eq("id", memberId)
    .is("unsubscribe_token", null);
  if (error) {
    // Race: someone else stamped it. Re-read.
    const { data } = await supabase
      .from("members")
      .select("unsubscribe_token")
      .eq("id", memberId)
      .single();
    return data?.unsubscribe_token ?? token;
  }
  return token;
}

function unsubscribeUrl(token: string): string {
  return `${SUPABASE_URL}/functions/v1/nurture-unsubscribe?token=${encodeURIComponent(token)}`;
}

interface SendResult {
  member_id: string;
  step: number;
  status: "sent" | "failed" | "skipped";
  error?: string;
  resend_message_id?: string;
}

async function sendOne(member: {
  id: string;
  email: string;
  skool_name: string | null;
  nurture_step: number;
  nurture_started_at: string | null;
  business_touch_count: number | null;
  unsubscribe_token: string | null;
}, dryRun: boolean): Promise<SendResult> {
  const nextStep = Math.min(member.nurture_step + 1, MAX_NURTURE_STEP);
  const email = getNurtureEmail(nextStep);

  if (!email) {
    const err = `copy_missing_step_${nextStep}`;
    await supabase.from("nurture_runs").insert({
      member_id: member.id,
      step: nextStep,
      status: "failed",
      error: err,
      job: "nurture-drip-send",
    });
    return { member_id: member.id, step: nextStep, status: "failed", error: err };
  }

  const token = dryRun
    ? "DRY_RUN_TOKEN"
    : await ensureUnsubscribeToken(member.id, member.unsubscribe_token);

  const rendered = renderNurtureEmail(email, {
    first_name: firstName(member.skool_name),
    unsubscribe: unsubscribeUrl(token),
  });

  if (dryRun) {
    return { member_id: member.id, step: nextStep, status: "skipped", error: "dry_run" };
  }

  if (!RESEND_API_KEY) {
    const err = "resend_api_key_missing";
    await supabase.from("nurture_runs").insert({
      member_id: member.id,
      step: nextStep,
      subject: rendered.subject,
      status: "failed",
      error: err,
      job: "nurture-drip-send",
    });
    return { member_id: member.id, step: nextStep, status: "failed", error: err };
  }

  // Send via Resend
  let resendId: string | undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: NURTURE_FROM_EMAIL,
        to: [member.email],
        subject: rendered.subject,
        html: rendered.html,
        reply_to: NURTURE_REPLY_TO,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl(token)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = `resend_${res.status}: ${JSON.stringify(body).slice(0, 300)}`;
      await supabase.from("nurture_runs").insert({
        member_id: member.id,
        step: nextStep,
        subject: rendered.subject,
        status: "failed",
        error: err,
        job: "nurture-drip-send",
      });
      return { member_id: member.id, step: nextStep, status: "failed", error: err };
    }
    resendId = body?.id;
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await supabase.from("nurture_runs").insert({
      member_id: member.id,
      step: nextStep,
      subject: rendered.subject,
      status: "failed",
      error: err,
      job: "nurture-drip-send",
    });
    return { member_id: member.id, step: nextStep, status: "failed", error: err };
  }

  // Success: stamp member + log
  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("members")
    .update({
      nurture_step: nextStep,
      nurture_started_at: member.nurture_started_at ?? now,
      last_business_touch: now,
      business_touch_count: (member.business_touch_count ?? 0) + 1,
    })
    .eq("id", member.id);

  await supabase.from("nurture_runs").insert({
    member_id: member.id,
    step: nextStep,
    subject: rendered.subject,
    sent_at: now,
    resend_message_id: resendId,
    status: updErr ? "sent_but_update_failed" : "sent",
    error: updErr?.message,
    job: "nurture-drip-send",
  });

  return {
    member_id: member.id,
    step: nextStep,
    status: "sent",
    resend_message_id: resendId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { dryRun?: boolean; limit?: number } = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { /* defaults */ }
  }
  const dryRun = !!body.dryRun;
  const limit = Math.min(Math.max(1, body.limit ?? MAX_PER_RUN), MAX_PER_RUN);

  const now = new Date();
  if (now < LAUNCH_AT && !dryRun) {
    return json({
      ok: true,
      skipped: true,
      reason: "pre_launch",
      launchAt: LAUNCH_AT.toISOString(),
      now: now.toISOString(),
    });
  }

  const cutoff = new Date(Date.now() - COOLDOWN_DAYS * 86_400_000).toISOString();

  // Two-pass query because PostgREST OR with mixed filters is awkward.
  // Pass A: never-started.
  const { data: starters, error: errA } = await supabase
    .from("members")
    .select("id, email, skool_name, nurture_step, nurture_started_at, business_touch_count, unsubscribe_token, intent_tier, nurture_status, last_business_touch")
    .in("intent_tier", ["curious", "prospect"])
    .eq("nurture_status", "active")
    .not("email", "is", null)
    .eq("nurture_step", 0)
    .order("join_date", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (errA) return json({ ok: false, reason: "query_failed_a", detail: errA.message }, 500);

  let pool = starters || [];

  if (pool.length < limit) {
    const remaining = limit - pool.length;
    const { data: continuers, error: errB } = await supabase
      .from("members")
      .select("id, email, skool_name, nurture_step, nurture_started_at, business_touch_count, unsubscribe_token, intent_tier, nurture_status, last_business_touch")
      .in("intent_tier", ["curious", "prospect"])
      .eq("nurture_status", "active")
      .not("email", "is", null)
      .gt("nurture_step", 0)
      .lt("nurture_step", MAX_NURTURE_STEP)
      .lte("last_business_touch", cutoff)
      .order("last_business_touch", { ascending: true, nullsFirst: true })
      .limit(remaining);
    if (errB) return json({ ok: false, reason: "query_failed_b", detail: errB.message }, 500);
    pool = pool.concat(continuers || []);
  }

  if (pool.length === 0) {
    return json({ ok: true, dryRun, eligibleCount: 0, results: [] });
  }

  if (dryRun) {
    return json({
      ok: true,
      dryRun: true,
      eligibleCount: pool.length,
      eligible: pool.map((m) => ({
        id: m.id,
        email: m.email,
        skool_name: m.skool_name,
        nurture_step: m.nurture_step,
        next_step: Math.min(m.nurture_step + 1, MAX_NURTURE_STEP),
        last_business_touch: m.last_business_touch,
      })),
    });
  }

  const results: SendResult[] = [];
  for (const m of pool) {
    // Sequential to be polite to Resend (50/run is well under their limits).
    // deno-lint-ignore no-await-in-loop
    const r = await sendOne(m as any, false);
    results.push(r);
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return json({ ok: true, eligibleCount: pool.length, sent, failed, results });
});