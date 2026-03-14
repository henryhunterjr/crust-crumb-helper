import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { loadAISettings, buildVoiceBlock } from '../_shared/ai-settings.ts';

const DAY_THEMES = [
  { day: 1, dayName: 'Sunday', theme: 'announcement', description: 'Announcement — what we\'re making, why it\'s special, recipe link' },
  { day: 2, dayName: 'Monday', theme: 'education', description: 'Education — history, cultural context, the story behind the bread' },
  { day: 3, dayName: 'Tuesday', theme: 'technique', description: 'Technique — the key skill or method that makes this bread work' },
  { day: 4, dayName: 'Wednesday', theme: 'ingredients', description: 'Ingredients — what you need, where to get it, substitutions' },
  { day: 5, dayName: 'Thursday', theme: 'troubleshooting', description: 'Troubleshooting — common mistakes for this bread and how to prevent them' },
  { day: 6, dayName: 'Friday', theme: 'final_prep', description: 'Final Prep — checklist, timeline, last-minute tips, build anticipation' },
  { day: 7, dayName: 'Saturday', theme: 'event_day', description: 'Event Day — kickoff + celebration and photo sharing' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bread_name, event_date, promotion_days = 7, special_notes, related_content, campaign_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up recipe
    let recipeInfo = '';
    let skoolUrl = '';
    if (bread_name) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('*')
        .ilike('title', `%${bread_name}%`)
        .limit(3);

      if (recipes && recipes.length > 0) {
        const recipe = recipes[0];
        skoolUrl = recipe.skool_url || recipe.url || '';
        recipeInfo = `Recipe: ${recipe.title}\nSkool URL: ${skoolUrl}\nShare URL: ${recipe.share_url || ''}\nDescription: ${recipe.description || ''}\nSkill Level: ${recipe.skill_level || 'beginner'}`;
      }
    }

    // Look up related classroom content
    let classroomInfo = '';
    if (related_content && related_content.length > 0) {
      classroomInfo = related_content.map((c: any) => `- ${c.title}: ${c.url || 'no URL'}`).join('\n');
    } else if (bread_name) {
      const { data: resources } = await supabase
        .from('classroom_resources')
        .select('title, url, category')
        .limit(5);
      
      if (resources) {
        classroomInfo = resources
          .filter(r => r.url)
          .map(r => `- ${r.title} (${r.category}): ${r.url}`)
          .join('\n');
      }
    }

    // Also look up bake-along course
    const { data: bakeAlongCourse } = await supabase
      .from('classroom_resources')
      .select('title, url')
      .ilike('title', '%bake-along%')
      .limit(1);

    const bakeAlongUrl = bakeAlongCourse?.[0]?.url || '';

    // Load AI personality settings from database
    const settings = await loadAISettings(supabase);
    const voiceBlock = buildVoiceBlock(settings);

    const systemPrompt = `You are generating a 7-day content campaign for ${settings.my_name}'s ${settings.community_name} Saturday Bake-Along.

${voiceBlock}

POST TYPES:
- "value" posts = Educational, informative, technique-focused. Include relevant classroom or recipe links. These teach something. 150-300 words.
- "engagement" posts = Questions, polls, photo requests, storytelling prompts, fun conversation starters. Keep shorter. 50-150 words.

LINKS:
- Use Skool tracking URLs for Recipe Pantry recipes
- Only include URLs that have been verified
- If a URL can't be verified, mention the resource by name instead

FORMATTING:
- No markdown headers
- Line breaks are fine
- Emoji use: 1-2 per post max, placed naturally
- Don't pad with filler

RECIPE INFO:
${recipeInfo || 'No specific recipe found'}

RELATED CLASSROOM CONTENT:
${classroomInfo || 'No specific courses found'}

BAKE-ALONG COURSE URL: ${bakeAlongUrl}

SPECIAL NOTES FROM HENRY:
${special_notes || 'None'}`;

    const posts = [];

    for (const dayTheme of DAY_THEMES.slice(0, promotion_days)) {
      const userPrompt = `Generate 2 posts for Day ${dayTheme.day} (${dayTheme.dayName}) — Theme: ${dayTheme.description}

The bread is: ${bread_name || 'TBD'}
Event date: ${event_date || 'upcoming Saturday'}

Post 1: VALUE post (12:30 PM ET) — educational, informative
Post 2: ENGAGEMENT post (7:00 PM ET) — community interaction

Return ONLY valid JSON array with exactly 2 objects:
[
  {"title": "...", "content": "...", "post_type": "value", "time_slot": "12:30 PM ET"},
  {"title": "...", "content": "...", "post_type": "engagement", "time_slot": "7:00 PM ET"}
]`;

      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error: ${errText}`);
      }

      const aiData = await response.json();
      let rawContent = aiData.choices?.[0]?.message?.content || '[]';
      
      // Extract JSON from possible markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) rawContent = jsonMatch[1].trim();

      try {
        const dayPosts = JSON.parse(rawContent);
        if (Array.isArray(dayPosts)) {
          dayPosts.forEach((p: any, idx: number) => {
            posts.push({
              day_number: dayTheme.day,
              day_name: dayTheme.dayName,
              theme: dayTheme.theme,
              post_type: idx === 0 ? 'value' : 'engagement',
              time_slot: idx === 0 ? '12:30 PM ET' : '7:00 PM ET',
              title: p.title || `Day ${dayTheme.day} - ${idx === 0 ? 'Value' : 'Engagement'}`,
              content: p.content || '',
            });
          });
        }
      } catch {
        // Fallback: create placeholder posts
        posts.push(
          {
            day_number: dayTheme.day,
            day_name: dayTheme.dayName,
            theme: dayTheme.theme,
            post_type: 'value',
            time_slot: '12:30 PM ET',
            title: `Day ${dayTheme.day}: ${dayTheme.theme} (Value)`,
            content: rawContent.substring(0, 500),
          },
          {
            day_number: dayTheme.day,
            day_name: dayTheme.dayName,
            theme: dayTheme.theme,
            post_type: 'engagement',
            time_slot: '7:00 PM ET',
            title: `Day ${dayTheme.day}: ${dayTheme.theme} (Engagement)`,
            content: 'Engagement post — to be written',
          }
        );
      }
    }

    // If campaign_id provided, save posts to DB
    if (campaign_id && posts.length > 0) {
      // Calculate scheduled dates based on event_date
      const eventDate = event_date ? new Date(event_date + 'T12:00:00') : new Date();
      
      const dbPosts = posts.map(p => {
        const scheduledDate = new Date(eventDate);
        scheduledDate.setDate(scheduledDate.getDate() - (promotion_days - p.day_number));
        
        return {
          campaign_id,
          day_number: p.day_number,
          time_slot: p.time_slot,
          post_type: p.post_type,
          theme: p.theme,
          title: p.title,
          content: p.content,
          status: 'drafted',
          scheduled_date: scheduledDate.toISOString().split('T')[0],
        };
      });

      const { error: insertError } = await supabase
        .from('campaign_posts')
        .insert(dbPosts);
      
      if (insertError) {
        console.error('Error saving posts:', insertError);
      }

      // Update campaign status
      await supabase
        .from('content_campaigns')
        .update({ status: 'active' })
        .eq('id', campaign_id);
    }

    return new Response(JSON.stringify({ posts, count: posts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating campaign:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
