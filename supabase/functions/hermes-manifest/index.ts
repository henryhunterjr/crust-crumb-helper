import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

const MANIFEST = {
  agent: "Hermes",
  owner: "Henry Hunter Jr.",
  project: "Crust & Crumb Academy — Community Manager",
  voice: {
    tone: "Direct, confident, warm, masculine, expert without gatekeeping.",
    contractions: "ok",
    forbidden_chars: ["—"],
    forbidden_words: ["ensure", "dive", "delve", "enhance", "tapestry", "unveil", "crucial"],
    formatting: "Plain text only when posting to Skool. No markdown.",
  },
  constraints: {
    skool_new_chats_per_week: 10,
    reengagement_dms_per_day: 5,
    delivery: "Manual copy-paste into Skool. No public Skool API.",
  },
  auth: {
    scheme: "Bearer",
    header: "Authorization: Bearer <INGEST_API_KEY>",
  },
  endpoints: {
    list_jobs: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/hermes-run`,
      body: { action: "list_jobs" },
    },
    list_runs: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/hermes-run`,
      body: { action: "list_runs", job_type: "<optional>", limit: 50 },
    },
    preview_job: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/hermes-run`,
      body: { job_id: "<uuid>", trigger: "agent", dry_run: true },
      note: "Generates draft content + metrics without persisting.",
    },
    run_job: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/hermes-run`,
      body: { job_id: "<uuid>", trigger: "agent", dry_run: false },
    },
    list_queue: {
      method: "GET",
      url: `${FUNCTIONS_BASE}/hermes-queue?status=generated&limit=50`,
      note: "Reads outreach_messages waiting for manual send.",
    },
    mark_sent: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/hermes-mark-sent`,
      body: { ids: ["<uuid>"], status: "sent" },
      note: "status: sent | skipped | failed | generated",
    },
    ingest_brief: {
      method: "POST",
      url: `${FUNCTIONS_BASE}/ingest-brief`,
      note: "Post the morning brief payload.",
    },
    get_brief: {
      method: "GET",
      url: `${FUNCTIONS_BASE}/get-brief`,
    },
  },
  jobs: [
    { job_type: "weekly_welcome_post", schedule: "Mon 8am ET", output: "Public Skool post draft" },
    { job_type: "daily_reengagement_dms", schedule: "Weekdays 7am ET", output: "DM drafts in outreach_messages (5/day cap, 10/week)" },
    { job_type: "weekly_analytics_brief", schedule: "Fri 4pm ET", output: "5-bullet decision brief + metrics" },
    { job_type: "weekly_newsletter_draft", schedule: "Thu 9am ET", output: "Pantry newsletter draft (Phase 3)" },
  ],
  models: {
    chat: "google/gemini-3-flash-preview",
    gateway: "https://ai.gateway.lovable.dev/v1/chat/completions",
  },
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify(MANIFEST, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});