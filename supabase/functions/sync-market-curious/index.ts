// Crust & Crumb Helper — sync-market-curious (STUB)
//
// Syncs members with intent_tier in (curious, prospect) AND nurture_status='active'
// AND email IS NOT NULL into a MailerLite group called "market-curious",
// tagging each subscriber with their intent_tier value (curious | prospect).
//
// This file ships in STUB mode: if MAILERLITE_API_KEY is missing, every
// non-dry-run call returns ok:false / reason:"not_configured" without throwing.
// Dry-run mode works regardless of secrets so /targets can show the eligible
// member count + list before MailerLite is wired up.
//
// Contracts that are locked in now (so activation later is env-vars-only):
// - MailerLite group name: market-curious
// - Subscriber tag = intent_tier value (curious | prospect)
// - Members flipped to nurture_status in (customer, opted_out) are removed
// - Each run logged to nurture_runs (job='sync-market-curious')

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAILERLITE_API_KEY = Deno.env.get("MAILERLITE_API_KEY");

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
    .select("id, skool_name, email, intent_tier, nurture_status, last_business_touch")
    .in("intent_tier", ["curious", "prospect"])
    .eq("nurture_status", "active")
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

  // Status — never touches DB or MailerLite, just reports config.
  if (action === "status") {
    return json({
      ok: true,
      configured: !!MAILERLITE_API_KEY,
      missing: MAILERLITE_API_KEY ? [] : ["MAILERLITE_API_KEY"],
      group: "market-curious",
    });
  }

  // Dry-run — works even without MailerLite. Returns the eligible list.
  if (action === "dryRun") {
    try {
      const eligible = await fetchEligible();
      return json({
        ok: true,
        dryRun: true,
        configured: !!MAILERLITE_API_KEY,
        eligibleCount: eligible.length,
        eligible,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ ok: false, reason: "query_failed", detail: message }, 500);
    }
  }

  // Real run — requires MAILERLITE_API_KEY. STUB: do not call MailerLite yet.
  if (!MAILERLITE_API_KEY) {
    await supabase.from("nurture_runs").insert({
      job: "sync-market-curious",
      status: "not_configured",
      detail: { missing: ["MAILERLITE_API_KEY"] },
      ended_at: new Date().toISOString(),
    });
    return json({
      ok: false,
      reason: "not_configured",
      missing: ["MAILERLITE_API_KEY"],
    });
  }

  // Placeholder for the real implementation. Intentionally not built yet.
  return json({
    ok: false,
    reason: "not_implemented",
    detail: "MailerLite sync is stubbed. Wire MAILERLITE_API_KEY and replace this branch.",
  });
});