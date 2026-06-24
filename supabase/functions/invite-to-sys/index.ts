// Crust & Crumb Helper — invite-to-sys (STUB)
//
// One-click migration into Sell Your Sourdough (SYS). For every eligible
// member, POST {SYS_WEBHOOK_URL}?email={email} and on 2xx set
// invited_to_sys=true, invited_to_sys_at=now().
//
// Eligibility:
//   intent_tier IN (curious, prospect)
//   AND nurture_status='active'
//   AND invited_to_sys=false
//   AND email IS NOT NULL
//
// This file ships in STUB mode: when SYS_WEBHOOK_URL is missing the run mode
// returns ok:false / reason:"not_configured" without throwing. Status + dry-run
// always work so /targets can preview the count.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SYS_WEBHOOK_URL = Deno.env.get("SYS_WEBHOOK_URL");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchEligible() {
  const { data, error } = await supabase
    .from("members")
    .select("id, skool_name, email, intent_tier, invited_to_sys, nurture_status")
    .in("intent_tier", ["curious", "prospect"])
    .eq("nurture_status", "active")
    .eq("invited_to_sys", false)
    .not("email", "is", null);
  if (error) throw error;
  return data || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { action?: "status" | "dryRun" | "run" } = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { /* defaults */ }
  }
  const action = body.action || (req.method === "GET" ? "status" : "dryRun");

  if (action === "status") {
    return json({
      ok: true,
      configured: !!SYS_WEBHOOK_URL,
      missing: SYS_WEBHOOK_URL ? [] : ["SYS_WEBHOOK_URL"],
    });
  }

  if (action === "dryRun") {
    try {
      const eligible = await fetchEligible();
      return json({
        ok: true,
        dryRun: true,
        configured: !!SYS_WEBHOOK_URL,
        eligibleCount: eligible.length,
        eligible,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ ok: false, reason: "query_failed", detail: message }, 500);
    }
  }

  if (!SYS_WEBHOOK_URL) {
    await supabase.from("nurture_runs").insert({
      job: "invite-to-sys",
      status: "not_configured",
      detail: { missing: ["SYS_WEBHOOK_URL"] },
      ended_at: new Date().toISOString(),
    });
    return json({
      ok: false,
      reason: "not_configured",
      missing: ["SYS_WEBHOOK_URL"],
    });
  }

  return json({
    ok: false,
    reason: "not_implemented",
    detail: "SYS invite is stubbed. Wire SYS_WEBHOOK_URL and replace this branch.",
  });
});