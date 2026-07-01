// Crust & Crumb Helper — Roster Ingestion Edge Function (P0)
// POST https://{PROJECT_REF}.supabase.co/functions/v1/ingest-roster
//
// Receives a Skool member roster read from the scheduled browser agent and
// upserts it into `members` exactly the way the CSV importer does, plus
// non-destructive reconciliation: members no longer on the roster are flagged
// (never deleted), and brand-new joiners are inserted. Each run is logged to
// roster_sync_runs for monitoring.
//
// The matching + engagement logic lives in ../_shared/roster-logic.ts, the
// single source of truth shared with the test suite.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  planRosterSync,
  deriveIntentTier,
  type ExistingMember,
  type RosterMemberInput,
} from "../_shared/roster-logic.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const INGEST_API_KEY = Deno.env.get("INGEST_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Auth — same Bearer INGEST_API_KEY pattern as ingest-brief.
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing authorization header" }, 401);
  }
  const token = authHeader.replace("Bearer ", "");
  if (INGEST_API_KEY && token !== INGEST_API_KEY) {
    return jsonResponse({ error: "Invalid API key" }, 403);
  }

  let payload: {
    runId?: string;
    capturedAt?: string;
    fullRoster?: boolean;
    community?: string;
    members?: RosterMemberInput[];
  };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const rows = payload.members;
  if (!Array.isArray(rows)) {
    return jsonResponse(
      { error: "Missing required field: members (array)" },
      400,
    );
  }
  // Fail safe: an empty read almost always means the reader broke (selectors
  // drifted, not logged in), not that the community emptied. Refuse it loudly
  // so a bad scrape can never flag the entire roster as missing.
  if (rows.length === 0) {
    await logRun(payload, {
      total_seen: 0,
      inserted: 0,
      updated: 0,
      missing_flagged: 0,
      skipped: 0,
      status: "failed",
      error: "Empty roster payload rejected (likely a broken read).",
    });
    return jsonResponse(
      {
        error:
          "Empty roster rejected. A read with zero members is treated as a failure, not an empty community.",
      },
      422,
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const fullRoster = payload.fullRoster === true;
  const community = typeof payload.community === "string"
    ? payload.community.trim().toLowerCase()
    : null;
  const isFotm = community === "from-oven-to-market";
  const FOUNDING_CUTOFF = "2026-07-06";

  try {
    // Existing members for matching. PostgREST caps a select at ~1000 rows by
    // default, so we MUST page through all of them. Matching against a partial
    // set would treat already-known members as new and insert duplicates.
    const existing = await fetchAllExisting();

    const plan = planRosterSync(rows, existing, now, {
      fullRoster,
    });

    let inserted = 0;
    let updated = 0;
    let missingFlagged = 0;

    // Inserts — new joiners. Mirror the CSV importer's row, stamped on_roster.
    if (plan.toInsert.length > 0) {
      const insertRows = plan.toInsert.map((m) => {
        const row: Record<string, unknown> = {
          ...m,
          roster_status: "on_roster",
          roster_last_seen_at: nowIso,
        };
        if (community) row.communities = [community];
        if (isFotm && m.join_date) {
          row.fotm_joined_at = m.join_date;
          if (m.join_date < FOUNDING_CUTOFF) row.fotm_tier = "founding";
        }
        return row;
      });
      const { data, error } = await supabase
        .from("members")
        .insert(insertRows)
        .select("id");
      if (error) throw error;
      inserted = data?.length ?? 0;
    }

    // Updates — partial, never wipes fields the read could not see.
    for (const { id, updates } of plan.toUpdate) {
      // Merge intent_raw append-only against the existing row, then derive
      // intent_tier from the merged map (so a single Q3 hit can set the tier
      // even if Q1 was captured on a different run).
      const finalUpdates: Record<string, unknown> = { ...updates };
      if (updates.intent_raw) {
        const existingRow = existing.find((e) => e.id === id) as
          | (ExistingMember & { intent_raw?: Record<string, string> | null })
          | undefined;
        const merged = {
          ...(existingRow?.intent_raw || {}),
          ...updates.intent_raw,
        };
        finalUpdates.intent_raw = merged;
        finalUpdates.intent_tier = deriveIntentTier(merged);
      }

      // Communities merge — append the roster's community if not already
      // present. Preserves any other memberships the member already has.
      if (community) {
        const existingRow = existing.find((e) => e.id === id) as
          | (ExistingMember & {
            communities?: string[] | null;
            fotm_joined_at?: string | null;
            fotm_tier?: string | null;
          })
          | undefined;
        const currentCommunities = existingRow?.communities ?? [];
        if (!currentCommunities.includes(community)) {
          finalUpdates.communities = [...currentCommunities, community];
        }
        // FOTM join-date + founding tier backfill — never overwrite an
        // existing value; only fill when we finally see the data.
        if (isFotm && updates.join_date) {
          if (!existingRow?.fotm_joined_at) {
            finalUpdates.fotm_joined_at = updates.join_date;
          }
          if (
            !existingRow?.fotm_tier &&
            updates.join_date < FOUNDING_CUTOFF
          ) {
            finalUpdates.fotm_tier = "founding";
          }
        }
      }

      const { error } = await supabase
        .from("members")
        .update({
          ...finalUpdates,
          roster_status: "on_roster",
          roster_last_seen_at: nowIso,
        })
        .eq("id", id);
      if (error) throw error;
      updated++;
    }

    // Reconciliation — flag members no longer on the roster (full reads only).
    if (fullRoster && plan.missingIds.length > 0) {
      const { error } = await supabase
        .from("members")
        .update({ roster_status: "missing_from_roster" })
        .in("id", plan.missingIds);
      if (error) throw error;
      missingFlagged = plan.missingIds.length;
    }

    const summary = {
      total_seen: rows.length,
      inserted,
      updated,
      missing_flagged: missingFlagged,
      skipped: plan.skipped,
      status: "completed" as const,
      error: null as string | null,
    };
    const runId = await logRun(payload, summary);

    return jsonResponse({
      status: "completed",
      runId: payload.runId ?? runId,
      fullRoster,
      ...summary,
      newMembers: inserted,
      missingMembers: missingFlagged,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("ingest-roster error:", message);
    await logRun(payload, {
      total_seen: rows.length,
      inserted: 0,
      updated: 0,
      missing_flagged: 0,
      skipped: 0,
      status: "failed",
      error: message,
    });
    return jsonResponse({ error: "Roster sync failed", detail: message }, 500);
  }
});

// Page through every member row, since a single select is capped at ~1000.
async function fetchAllExisting(): Promise<ExistingMember[]> {
  const all: ExistingMember[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("members")
      .select("id, skool_name, skool_username, intent_raw, communities, fotm_joined_at, fotm_tier")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data || []) as ExistingMember[];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

async function logRun(
  payload: { runId?: string; capturedAt?: string; fullRoster?: boolean },
  summary: {
    total_seen: number;
    inserted: number;
    updated: number;
    missing_flagged: number;
    skipped: number;
    status: string;
    error: string | null;
  },
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("roster_sync_runs")
      .insert({
        run_id: payload.runId ?? null,
        source: "browser-agent",
        full_roster: payload.fullRoster === true,
        captured_at: payload.capturedAt ?? null,
        ...summary,
      })
      .select("id")
      .single();
    return data?.id ?? null;
  } catch (e) {
    console.error("Failed to log roster_sync_run:", e);
    return null;
  }
}
