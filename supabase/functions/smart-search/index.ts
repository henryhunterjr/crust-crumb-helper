import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  source: 'quick_response' | 'classroom' | 'module' | 'recipe';
  id: string;
  title: string;
  content: string;
  url?: string | null;
  category?: string;
  score: number;
  metadata?: Record<string, any>;
}

function scoreMatch(query: string, text: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const words = queryLower.split(/\s+/).filter(w => w.length > 2);

  let score = 0;

  // Exact phrase match
  if (lower.includes(queryLower)) score += 10;

  // Word matches
  for (const word of words) {
    if (lower.includes(word)) score += 3;
  }

  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, compose_response = false } = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Search all sources in parallel
    const [qrResult, crResult, cmResult, recipeResult] = await Promise.all([
      supabase.from('quick_responses').select('*'),
      supabase.from('classroom_resources').select('*'),
      supabase.from('course_modules').select('*'),
      supabase.from('recipes').select('*'),
    ]);

    const results: SearchResult[] = [];

    // Score quick responses
    if (qrResult.data) {
      for (const qr of qrResult.data) {
        const titleScore = scoreMatch(query, qr.title) * 2;
        const contentScore = scoreMatch(query, qr.content);
        const tagScore = (qr.trigger_phrases || []).some((p: string) =>
          p.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(p.toLowerCase())
        ) ? 8 : 0;
        const topicScore = (qr.topic_tags || []).some((t: string) =>
          t.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(t.toLowerCase())
        ) ? 6 : 0;

        const total = titleScore + contentScore + tagScore + topicScore;
        if (total > 0) {
          results.push({
            source: 'quick_response',
            id: qr.id,
            title: qr.title,
            content: qr.content,
            category: qr.category,
            score: total,
            metadata: { use_count: qr.use_count, trigger_phrases: qr.trigger_phrases, topic_tags: qr.topic_tags },
          });
        }
      }
    }

    // Score classroom resources
    if (crResult.data) {
      for (const cr of crResult.data) {
        const titleScore = scoreMatch(query, cr.title) * 2;
        const descScore = scoreMatch(query, cr.description || '');
        const keywordScore = (cr.keywords || []).some((k: string) =>
          k.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(k.toLowerCase())
        ) ? 6 : 0;

        const total = titleScore + descScore + keywordScore;
        if (total > 0) {
          results.push({
            source: 'classroom',
            id: cr.id,
            title: cr.title,
            content: cr.description || '',
            url: cr.url,
            category: cr.category,
            score: total,
            metadata: { skill_level: cr.skill_level, url_verified: cr.url_verified },
          });
        }
      }
    }

    // Score course modules
    if (cmResult.data) {
      for (const cm of cmResult.data) {
        const titleScore = scoreMatch(query, cm.title) * 2;
        const topicScore = (cm.topics || []).some((t: string) =>
          t.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(t.toLowerCase())
        ) ? 6 : 0;

        const total = titleScore + topicScore;
        if (total > 0) {
          results.push({
            source: 'module',
            id: cm.id,
            title: cm.title,
            content: (cm.topics || []).join(', '),
            url: cm.url,
            score: total,
            metadata: { resource_id: cm.resource_id, url_verified: cm.url_verified },
          });
        }
      }
    }

    // Score recipes
    if (recipeResult.data) {
      for (const r of recipeResult.data) {
        const titleScore = scoreMatch(query, r.title) * 2;
        const descScore = scoreMatch(query, r.description || '');
        const keywordScore = (r.keywords || []).some((k: string) =>
          k.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(k.toLowerCase())
        ) ? 5 : 0;
        const tagScore = (r.tags || []).some((t: string) =>
          t.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(t.toLowerCase())
        ) ? 4 : 0;

        const total = titleScore + descScore + keywordScore + tagScore;
        if (total > 0) {
          results.push({
            source: 'recipe',
            id: r.id,
            title: r.title,
            content: r.description || '',
            url: r.skool_url || r.url,
            category: r.category,
            score: total,
            metadata: { skill_level: r.skill_level, url_verified: r.url_verified },
          });
        }
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Group by source
    const grouped = {
      quick_responses: results.filter(r => r.source === 'quick_response'),
      classroom: results.filter(r => r.source === 'classroom' || r.source === 'module'),
      recipes: results.filter(r => r.source === 'recipe'),
    };

    let composedResponse: string | null = null;

    // AI-compose a draft response if requested and we have results
    if (compose_response && results.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        const bestQR = grouped.quick_responses[0];
        const bestClassroom = grouped.classroom.slice(0, 2);
        const bestRecipe = grouped.recipes[0];

        let context = '';
        if (bestQR) {
          context += `BASE QUICK RESPONSE:\nTitle: ${bestQR.title}\nContent: ${bestQR.content}\n\n`;
        }
        if (bestClassroom.length > 0) {
          context += `RELEVANT CLASSROOM CONTENT:\n${bestClassroom.map(c => `- ${c.title}${c.url ? ` (URL: ${c.url})` : ''}`).join('\n')}\n\n`;
        }
        if (bestRecipe) {
          context += `RELEVANT RECIPE:\n- ${bestRecipe.title}${bestRecipe.url ? ` (URL: ${bestRecipe.url})` : ''}\n\n`;
        }

        const systemPrompt = `You are helping Henry Hunter Jr. respond to a member's question in Crust & Crumb Academy.

VOICE: Clear, confident, practical. Use contractions. No em dashes.
Avoid: "ensure", "dive", "delve", "enhance", "game changer", "tapestry", "don't hesitate", "embark", "journey", "excited", "crucial"
Be encouraging but not corny. Keep it concise (3-5 short paragraphs).

RULES:
- Base your response on the provided quick response template if available
- Include verified classroom links where relevant (max 2)
- Include a recipe link only if the question is about a specific bread
- If a URL is provided, include it. If not, mention the course/recipe by name and say "check it out in the classroom"
- End with encouragement, not a question
- Sign off warmly but not with excessive emoji (one is fine)
- Keep under 150 words

${context}`;

        try {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3-flash-preview',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `A member asked: "${query}"\n\nCompose a helpful response.` },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            composedResponse = aiData.choices?.[0]?.message?.content?.trim() || null;
          }
        } catch (err) {
          console.error('AI composition error:', err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        query,
        total_results: results.length,
        grouped,
        composed_response: composedResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Smart search error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
