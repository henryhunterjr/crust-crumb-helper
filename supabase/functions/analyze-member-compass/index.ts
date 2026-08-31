import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from '../_shared/cors.ts';

type ExtractedCompass = {
  baking_stage: 'new' | 'developing' | 'confident' | 'advanced' | 'unknown';
  struggles: string[];
  learning_goals: string[];
  bread_interests: string[];
  why_they_bake: string | null;
  personal_hooks: string[];
  member_language: string[];
  next_best_action: string | null;
  source_summary: string | null;
  insight_confidence: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function words(value: string) {
  return new Set(
    value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
      .filter((word) => word.length > 2 && !['the','and','for','with','that','this','from','want','would','have','been','into','about','bread','baking'].includes(word))
  );
}

function scoreText(needText: string, candidateText: string) {
  const need = words(needText);
  const candidate = words(candidateText);
  let score = 0;
  for (const word of need) {
    if (candidate.has(word)) score += 1;
  }
  const normalizedNeed = needText.trim().toLowerCase();
  if (normalizedNeed.length > 3 && candidateText.toLowerCase().includes(normalizedNeed)) score += 4;
  return score;
}

async function requireAdmin(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get('Authorization');
  if (!authorization) throw new Error('AUTH_REQUIRED');
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new Error('AUTH_REQUIRED');
  const { data: roleRows, error: roleError } = await client
    .from('user_roles')
    .select('role')
    .eq('user_id', authData.user.id);
  if (roleError || !roleRows?.some((row: any) => row.role === 'admin')) throw new Error('ADMIN_REQUIRED');
  return authData.user;
}

async function extractCompass(text: string, lovableKey: string): Promise<ExtractedCompass> {
  const systemPrompt = `You extract member-service intelligence for Henry Hunter's Crust & Crumb Academy.

RULES:
- Use ONLY facts present in the supplied source text.
- Never infer hobbies, motives, skill, struggles, family details, or preferences that are not stated or strongly evidenced.
- Missing facts must be null, "unknown", or an empty array.
- baking_stage must be conservative: new only when they describe being new; advanced only with explicit advanced experience; otherwise developing/confident only when supported; else unknown.
- Keep array items short, plain-language and useful for coaching.
- personal_hooks are human details Henry may remember, only when explicitly stated.
- member_language is 1-5 short phrases/themes reflecting how the member describes their own needs. Do not embellish.
- next_best_action is ONE concrete helpful action Henry or the Academy can take next, based only on the stated need. It is not sales copy.
- source_summary is a concise factual summary.
- confidence is 0 to 1 based on how much useful evidence the source provides.

Return ONLY JSON matching this shape:
{
  "baking_stage":"new|developing|confident|advanced|unknown",
  "struggles":[],
  "learning_goals":[],
  "bread_interests":[],
  "why_they_bake":null,
  "personal_hooks":[],
  "member_language":[],
  "next_best_action":null,
  "source_summary":null,
  "insight_confidence":0
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `SOURCE TEXT:\n${text.slice(0, 12000)}` },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`AI analysis failed (${response.status}): ${message.slice(0, 240)}`);
  }
  const payload = await response.json();
  const raw = payload.choices?.[0]?.message?.content || '';
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned no parseable JSON');
  const parsed = JSON.parse(match[0]);
  const validStages = new Set(['new','developing','confident','advanced','unknown']);
  return {
    baking_stage: validStages.has(parsed.baking_stage) ? parsed.baking_stage : 'unknown',
    struggles: Array.isArray(parsed.struggles) ? parsed.struggles.filter(Boolean).slice(0, 8) : [],
    learning_goals: Array.isArray(parsed.learning_goals) ? parsed.learning_goals.filter(Boolean).slice(0, 8) : [],
    bread_interests: Array.isArray(parsed.bread_interests) ? parsed.bread_interests.filter(Boolean).slice(0, 8) : [],
    why_they_bake: typeof parsed.why_they_bake === 'string' && parsed.why_they_bake.trim() ? parsed.why_they_bake.trim() : null,
    personal_hooks: Array.isArray(parsed.personal_hooks) ? parsed.personal_hooks.filter(Boolean).slice(0, 8) : [],
    member_language: Array.isArray(parsed.member_language) ? parsed.member_language.filter(Boolean).slice(0, 5) : [],
    next_best_action: typeof parsed.next_best_action === 'string' && parsed.next_best_action.trim() ? parsed.next_best_action.trim() : null,
    source_summary: typeof parsed.source_summary === 'string' && parsed.source_summary.trim() ? parsed.source_summary.trim() : null,
    insight_confidence: Math.max(0, Math.min(1, Number(parsed.insight_confidence) || 0)),
  };
}

async function matchExistingResource(service: any, extracted: ExtractedCompass) {
  const needs = [...extracted.struggles, ...extracted.learning_goals, ...extracted.bread_interests].filter(Boolean);
  if (!needs.length) return null;
  const needText = needs.join(' ');

  const [interestResult, classroomResult, recipeResult] = await Promise.all([
    service.from('interest_resources').select('tag,resource_title,resource_url,quick_win'),
    service.from('classroom_resources').select('title,description,category,skill_level,keywords,url').eq('url_verified', true).limit(500),
    service.from('recipes').select('title,description,category,skill_level,keywords,tags,url,share_url,skool_url').eq('url_verified', true).limit(500),
  ]);

  const candidates: Array<{ type: string; title: string; url: string; text: string; score: number }> = [];
  for (const row of interestResult.data || []) {
    if (!row.resource_title || !row.resource_url) continue;
    const text = [row.tag, row.resource_title, row.quick_win].filter(Boolean).join(' ');
    candidates.push({ type: 'interest resource', title: row.resource_title, url: row.resource_url, text, score: scoreText(needText, text) + 1 });
  }
  for (const row of classroomResult.data || []) {
    if (!row.title || !row.url) continue;
    const text = [row.title, row.description, row.category, row.skill_level, ...(row.keywords || [])].filter(Boolean).join(' ');
    candidates.push({ type: 'Academy resource', title: row.title, url: row.url, text, score: scoreText(needText, text) });
  }
  for (const row of recipeResult.data || []) {
    const url = row.share_url || row.url || row.skool_url;
    if (!row.title || !url) continue;
    const text = [row.title, row.description, row.category, row.skill_level, ...(row.keywords || []), ...(row.tags || [])].filter(Boolean).join(' ');
    candidates.push({ type: 'Recipe Pantry recipe', title: row.title, url, text, score: scoreText(needText, text) });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best || best.score < 2) return null;
  return { type: best.type, title: best.title, url: best.url };
}

async function analyzeMember(service: any, memberId: string, lovableKey: string, force: boolean) {
  const { data: member, error: memberError } = await service
    .from('members')
    .select('id,skool_name,application_answer')
    .eq('id', memberId)
    .maybeSingle();
  if (memberError) throw memberError;
  if (!member) throw new Error('Member not found');

  const { data: existingProfile } = await service
    .from('member_compass_profiles')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();
  if (existingProfile?.manually_edited && !force) {
    return { skipped: true, reason: 'manual_profile', profile: existingProfile };
  }

  const { data: sources, error: sourceError } = await service
    .from('member_sources')
    .select('*')
    .eq('member_id', memberId)
    .order('captured_at', { ascending: true });
  if (sourceError) throw sourceError;

  if (member.application_answer?.trim()) {
    const externalId = `application:${memberId}`;
    const { data: existingApplication } = await service
      .from('member_sources')
      .select('id')
      .eq('source_external_id', externalId)
      .maybeSingle();
    if (!existingApplication) {
      await service.from('member_sources').insert({
        member_id: memberId,
        source_type: 'application',
        source_external_id: externalId,
        source_author: member.skool_name,
        source_text: member.application_answer.trim(),
        captured_at: new Date().toISOString(),
        match_status: 'matched',
        match_confidence: 1,
      });
      sources?.push({ source_type: 'application', source_text: member.application_answer.trim() });
    }
  }

  const evidence = (sources || [])
    .map((source: any) => `[${source.source_type}] ${source.source_text || ''}`.trim())
    .filter((value: string) => value.length > 10)
    .join('\n\n');
  if (!evidence) return { skipped: true, reason: 'no_source_text' };

  const extracted = await extractCompass(evidence, lovableKey);
  const resource = await matchExistingResource(service, extracted);
  const now = new Date().toISOString();
  const payload = {
    member_id: memberId,
    ...extracted,
    recommended_resource_type: resource?.type || null,
    recommended_resource_title: resource?.title || null,
    recommended_resource_url: resource?.url || null,
    manually_edited: false,
    last_analyzed_at: now,
    updated_at: now,
  };

  const { data: profile, error: profileError } = await service
    .from('member_compass_profiles')
    .upsert(payload, { onConflict: 'member_id' })
    .select('*')
    .single();
  if (profileError) throw profileError;
  return { skipped: false, profile };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey || !lovableKey) throw new Error('Required environment is not configured');

    await requireAdmin(req, supabaseUrl, anonKey);
    const service = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const action = body?.action || 'analyze';

    if (action === 'analyze') {
      if (!body.memberId) return jsonResponse({ error: 'memberId is required' }, 400);
      const result = await analyzeMember(service, String(body.memberId), lovableKey, Boolean(body.force));
      return jsonResponse(result);
    }

    if (action === 'backfill') {
      const limit = Math.max(1, Math.min(10, Number(body.limit) || 5));
      const cursor = body.cursor ? String(body.cursor) : null;
      let query = service
        .from('members')
        .select('id')
        .not('application_answer', 'is', null)
        .neq('application_answer', '')
        .order('id', { ascending: true })
        .limit(limit * 4);
      if (cursor) query = query.gt('id', cursor);
      const { data: candidates, error: candidateError } = await query;
      if (candidateError) throw candidateError;

      let processed = 0;
      let lastCursor = cursor;
      const results: any[] = [];
      for (const candidate of candidates || []) {
        if (processed >= limit) break;
        lastCursor = candidate.id;
        const { data: existing } = await service
          .from('member_compass_profiles')
          .select('member_id,manually_edited,last_analyzed_at')
          .eq('member_id', candidate.id)
          .maybeSingle();
        if (existing?.manually_edited || existing?.last_analyzed_at) continue;
        try {
          const result = await analyzeMember(service, candidate.id, lovableKey, false);
          results.push({ memberId: candidate.id, ...result });
        } catch (error) {
          results.push({ memberId: candidate.id, error: error instanceof Error ? error.message : 'failed' });
        }
        processed += 1;
      }
      return jsonResponse({ processed, nextCursor: lastCursor, done: !candidates || candidates.length < limit * 4, results });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'AUTH_REQUIRED') return jsonResponse({ error: 'Authentication required' }, 401);
    if (message === 'ADMIN_REQUIRED') return jsonResponse({ error: 'Admin access required' }, 403);
    console.error('analyze-member-compass error:', error);
    return jsonResponse({ error: message }, 500);
  }
});
