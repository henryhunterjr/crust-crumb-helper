// Member Compass analyzer.
//
// Reads a member's introduction text (member_sources) plus their
// application_answer and produces a structured Compass profile.
//
// Hard rules:
//  - Never invent facts. Missing information stays empty.
//  - Recommendations may ONLY point at rows that already exist in
//    interest_mappings / interest_resources / classroom_resources / recipes.
//    No phantom links, ever.
//  - Manual edits are never overwritten unless force = true.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const STAGES = ["new", "developing", "confident", "advanced", "unknown"];

interface ResourceRow {
  kind: string;
  title: string;
  url: string | null;
  keywords: string[];
}

// ---------------------------------------------------------------- resources
async function loadResourceCatalog(): Promise<ResourceRow[]> {
  const out: ResourceRow[] = [];

  const [courses, recipes, mappings, interestRes] = await Promise.all([
    admin.from("classroom_resources").select("title, url, keywords, category, description"),
    admin.from("recipes").select("title, url, skool_url, share_url, keywords, tags, category"),
    admin.from("interest_mappings").select("keywords, recommended_course, recommended_recipe, quick_win, book_link, is_hidden"),
    admin.from("interest_resources").select("tag, resource_title, resource_url, quick_win"),
  ]);

  for (const r of courses.data || []) {
    out.push({
      kind: "course",
      title: r.title,
      url: r.url ?? null,
      keywords: [
        ...(r.keywords || []),
        r.category || "",
        r.title || "",
      ].filter(Boolean).map((k: string) => k.toLowerCase()),
    });
  }

  for (const r of recipes.data || []) {
    out.push({
      kind: "recipe",
      title: r.title,
      url: r.skool_url || r.url || r.share_url || null,
      keywords: [
        ...(r.keywords || []),
        ...(r.tags || []),
        r.category || "",
        r.title || "",
      ].filter(Boolean).map((k: string) => k.toLowerCase()),
    });
  }

  for (const r of mappings.data || []) {
    if (r.is_hidden) continue;
    const kws = (r.keywords || []).map((k: string) => k.toLowerCase());
    if (r.recommended_course) {
      out.push({ kind: "course", title: r.recommended_course, url: r.book_link ?? null, keywords: kws });
    }
    if (r.recommended_recipe) {
      out.push({ kind: "recipe", title: r.recommended_recipe, url: null, keywords: kws });
    }
    if (r.quick_win) {
      out.push({ kind: "quick_win", title: r.quick_win, url: null, keywords: kws });
    }
  }

  for (const r of interestRes.data || []) {
    if (!r.resource_title && !r.quick_win) continue;
    out.push({
      kind: r.resource_title ? "resource" : "quick_win",
      title: r.resource_title || r.quick_win,
      url: r.resource_url ?? null,
      keywords: [r.tag || ""].filter(Boolean).map((k: string) => k.toLowerCase()),
    });
  }

  return out;
}

// Score a resource against the member's extracted signals. Only real rows can
// ever be returned, so there is no way to fabricate a link.
function matchResource(catalog: ResourceRow[], signals: string[]): ResourceRow | null {
  const terms = signals
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  if (terms.length === 0) return null;

  let best: { row: ResourceRow; score: number } | null = null;
  for (const row of catalog) {
    let score = 0;
    for (const kw of row.keywords) {
      for (const t of terms) {
        if (kw === t) score += 3;
        else if (kw.includes(t) || t.includes(kw)) score += 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  // Require a real signal, not a single fuzzy overlap.
  if (!best || best.score < 3) return null;
  return best.row;
}

// ------------------------------------------------------------------- prompt
const SYSTEM_PROMPT = `You read a bread-community member's own words and extract only what is actually there.

ABSOLUTE RULES
- Never invent, infer beyond the text, or fill gaps with plausible guesses.
- If something is not stated, return an empty string or an empty array. Empty is correct and expected.
- Quote or closely paraphrase the member's own wording for member_language.
- No em dashes. No hype words. Plain, direct language.

Return ONLY JSON matching this shape:
{
  "baking_stage": "new" | "developing" | "confident" | "advanced" | "unknown",
  "struggles": string[],
  "learning_goals": string[],
  "bread_interests": string[],
  "why_they_bake": string,
  "personal_hooks": string[],
  "member_language": string[],
  "next_best_action": string,
  "insight_confidence": "low" | "medium" | "high",
  "source_summary": string
}

Guidance:
- baking_stage: "new" only if they say they are starting out or brand new. "unknown" when unclear.
- struggles: concrete problems named by the member (dense crumb, flat loaves, starter won't rise).
- learning_goals: what they said they want to learn or achieve.
- bread_interests: specific breads or techniques they named (baguettes, sourdough, focaccia, fermentation).
- why_they_bake: their stated motivation, in one short sentence, only if stated.
- personal_hooks: human details worth remembering (family, health, retirement, farmers market).
- member_language: 1 to 5 short phrases in their own words.
- next_best_action: ONE concrete thing Henry could do next for this person. If the text is too thin, return "".
- insight_confidence: "high" only when the text is rich and specific.
- source_summary: one plain sentence describing what the source text was.`;

async function analyzeText(text: string): Promise<Record<string, unknown>> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Member's own words:\n\n${text}` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate limited by the AI gateway. Try again shortly.");
  if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);

  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content ?? "{}";
  const cleaned = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ------------------------------------------------------------------ handler
serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  // Admin-only. This reads member data, so the caller must be a signed-in admin.
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Not authenticated" }, 401);
  }
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await asUser.auth.getUser();
  const user = userRes?.user;
  if (!user) return json({ error: "Not authenticated" }, 401);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin access required" }, 403);

  let body: {
    member_id?: string;
    member_ids?: string[];
    backfill?: boolean;
    limit?: number;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const force = body.force === true;

  try {
    // Resolve the target member ids.
    let memberIds: string[] = [];
    if (body.member_id) memberIds = [body.member_id];
    else if (Array.isArray(body.member_ids)) memberIds = body.member_ids.slice(0, 200);
    else if (body.backfill) {
      const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 100);
      // Resumable: only members with meaningful application_answer and no
      // profile yet. Re-running simply picks up where it left off.
      const { data: existing } = await admin
        .from("member_compass_profiles")
        .select("member_id");
      const done = new Set((existing || []).map((r: any) => r.member_id));

      const { data: candidates } = await admin
        .from("members")
        .select("id, application_answer")
        .not("application_answer", "is", null)
        .limit(2000);

      memberIds = (candidates || [])
        .filter((m: any) => !done.has(m.id) && String(m.application_answer || "").trim().length >= 40)
        .slice(0, limit)
        .map((m: any) => m.id);
    }

    if (memberIds.length === 0) {
      return json({ ok: true, analyzed: 0, skipped: 0, remaining: 0, results: [] });
    }

    const catalog = await loadResourceCatalog();

    const { data: members } = await admin
      .from("members")
      .select("id, skool_name, application_answer")
      .in("id", memberIds);

    const { data: sources } = await admin
      .from("member_sources")
      .select("member_id, source_text, source_type, source_url, captured_at")
      .in("member_id", memberIds)
      .order("captured_at", { ascending: false });

    const { data: profiles } = await admin
      .from("member_compass_profiles")
      .select("member_id, manually_edited")
      .in("member_id", memberIds);
    const editedMap = new Map((profiles || []).map((p: any) => [p.member_id, p.manually_edited]));

    const sourcesByMember = new Map<string, any[]>();
    for (const s of sources || []) {
      const list = sourcesByMember.get(s.member_id) || [];
      list.push(s);
      sourcesByMember.set(s.member_id, list);
    }

    const results: any[] = [];
    let analyzed = 0;
    let skipped = 0;

    for (const m of members || []) {
      // Respect manual edits unless Henry explicitly re-analyzes.
      if (editedMap.get(m.id) && !force) {
        skipped++;
        results.push({ member_id: m.id, status: "skipped_manual_edit" });
        continue;
      }

      const parts: string[] = [];
      const app = String(m.application_answer || "").trim();
      if (app) parts.push(`Application answer:\n${app}`);
      for (const s of (sourcesByMember.get(m.id) || []).slice(0, 5)) {
        parts.push(`${s.source_type} (${s.captured_at}):\n${s.source_text}`);
      }
      const text = parts.join("\n\n---\n\n").trim();

      if (text.length < 20) {
        skipped++;
        results.push({ member_id: m.id, status: "skipped_no_text" });
        continue;
      }

      let extracted: Record<string, unknown> = {};
      try {
        extracted = await analyzeText(text);
      } catch (e) {
        results.push({ member_id: m.id, status: "error", error: String((e as Error).message) });
        continue;
      }

      const stageRaw = str(extracted.baking_stage).toLowerCase();
      const stage = STAGES.includes(stageRaw) ? stageRaw : "unknown";
      const struggles = arr(extracted.struggles);
      const goals = arr(extracted.learning_goals);
      const interests = arr(extracted.bread_interests);

      const match = matchResource(catalog, [...interests, ...goals, ...struggles]);

      const row = {
        member_id: m.id,
        baking_stage: stage,
        struggles,
        learning_goals: goals,
        bread_interests: interests,
        why_they_bake: str(extracted.why_they_bake) || null,
        personal_hooks: arr(extracted.personal_hooks),
        member_language: arr(extracted.member_language),
        next_best_action: str(extracted.next_best_action) || null,
        // Blank when nothing real matches. Never a phantom link.
        recommended_resource_type: match ? match.kind : null,
        recommended_resource_title: match ? match.title : null,
        recommended_resource_url: match ? match.url : null,
        insight_confidence: ["low", "medium", "high"].includes(str(extracted.insight_confidence))
          ? str(extracted.insight_confidence)
          : "low",
        source_summary: str(extracted.source_summary) || null,
        manually_edited: false,
        last_analyzed_at: new Date().toISOString(),
      };

      const { error } = await admin
        .from("member_compass_profiles")
        .upsert(row, { onConflict: "member_id" });

      if (error) {
        results.push({ member_id: m.id, status: "error", error: error.message });
        continue;
      }
      analyzed++;
      results.push({ member_id: m.id, status: "analyzed", profile: row });
    }

    // Report how much backfill work is left so the UI can loop safely.
    let remaining = 0;
    if (body.backfill) {
      const { data: done2 } = await admin.from("member_compass_profiles").select("member_id");
      const doneSet = new Set((done2 || []).map((r: any) => r.member_id));
      const { data: all } = await admin
        .from("members")
        .select("id, application_answer")
        .not("application_answer", "is", null)
        .limit(5000);
      remaining = (all || []).filter(
        (m: any) => !doneSet.has(m.id) && String(m.application_answer || "").trim().length >= 40,
      ).length;
    }

    return json({ ok: true, analyzed, skipped, remaining, results });
  } catch (err) {
    console.error("analyze-member-compass error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
