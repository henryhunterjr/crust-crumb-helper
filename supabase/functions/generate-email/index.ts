import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaign_type, subscriber, member, tags, interest_mappings } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch resources for personalization
    const [recipesResult, coursesResult] = await Promise.all([
      supabase.from('recipes').select('title, share_url, url, skill_level, url_verified').limit(10),
      supabase.from('classroom_resources').select('title, url, skill_level, url_verified').limit(10),
    ]);

    const recipes = recipesResult.data || [];
    const courses = coursesResult.data || [];

    const firstName = subscriber?.first_name || member?.skool_name?.split(' ')[0] || 'there';
    const memberTags = (tags || []).map((t: any) => t.tag || t).join(', ');

    // Build personalized content suggestions
    let contentSuggestions = '';
    if (memberTags) {
      const relevantMappings = (interest_mappings || []).filter((m: any) => 
        m.keywords?.some((k: string) => memberTags.toLowerCase().includes(k.toLowerCase()))
      );
      if (relevantMappings.length > 0) {
        contentSuggestions = relevantMappings.map((m: any) => {
          const parts = [];
          if (m.recommended_course) parts.push(`Course: ${m.recommended_course}`);
          if (m.recommended_recipe) parts.push(`Recipe: ${m.recommended_recipe}`);
          if (m.quick_win) parts.push(`Quick Win: ${m.quick_win}`);
          return parts.join(', ');
        }).join('\n');
      }
    }

    // Build recipe links (use share_url for emails, not skool_url)
    const recipeLinks = recipes
      .filter(r => r.url_verified && (r.share_url || r.url))
      .slice(0, 3)
      .map(r => `${r.title}: ${r.share_url || r.url}`)
      .join('\n');

    let systemPrompt = '';
    let userPrompt = '';

    switch (campaign_type) {
      case 'recruitment': {
        systemPrompt = `You are Henry Hunter Jr., writing a personal email to invite a blog subscriber to join Crust & Crumb Academy on Skool.

VOICE: Warm, personal, confident. Use contractions. No em dashes.
Avoid: "ensure", "dive", "delve", "enhance", "game changer", "tapestry", "don't hesitate", "embark", "journey", "excited", "crucial"

RULES:
- Write a compelling subject line (under 60 characters)
- Address them by first name
- Mention they're already following Baking Great Bread at Home
- Highlight what's inside the Academy: 25+ courses, weekly Saturday Bake-Alongs, 65+ recipes, direct access to you
- Include the Academy join link: https://www.skool.com/crust-crumb-academy-7621/about
- Keep it 5-6 paragraphs
- Sign off: "See you inside, Henry" or similar
- Feel like a personal email, not a newsletter

OUTPUT FORMAT:
SUBJECT: [subject line]

[email body]`;

        userPrompt = `Write a recruitment email to ${firstName}. They subscribed to my email list${subscriber?.subscription_time ? ` around ${new Date(subscriber.subscription_time).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ''}.`;
        break;
      }

      case 'reengagement': {
        systemPrompt = `You are Henry Hunter Jr., writing a re-engagement email to an inactive Skool Academy member.

VOICE: Warm, caring, no pressure. Use contractions. No em dashes.
Avoid: "ensure", "dive", "delve", "enhance", "game changer", "tapestry", "don't hesitate", "embark", "journey", "excited", "crucial"

RULES:
- Write a compelling subject line (under 60 characters)
- Address them by first name
- Acknowledge they haven't been around without being guilt-trippy
- Mention what they've missed (new courses, bake-alongs, recipes)
- If they have interest tags, personalize with their interests
- Include the Academy link: https://www.skool.com/crust-crumb-academy-7621/about
- Use GENERAL share links for recipes (not Skool tracking links)
- Keep it 5-6 paragraphs
- Sign off: "Your spot is still there, Henry"

${memberTags ? `\nMEMBER INTERESTS: ${memberTags}` : ''}
${contentSuggestions ? `\nPERSONALIZED CONTENT:\n${contentSuggestions}` : ''}
${recipeLinks ? `\nRECIPE LINKS (use these share links):\n${recipeLinks}` : ''}

OUTPUT FORMAT:
SUBJECT: [subject line]

[email body]`;

        const lastActive = member?.last_active ? `Last active: ${member.last_active}` : '';
        userPrompt = `Write a re-engagement email to ${firstName}. ${lastActive}. They're a Skool member who hasn't been active recently.`;
        break;
      }

      case 'digest': {
        systemPrompt = `You are Henry Hunter Jr., writing a weekly digest email for active Academy members.

VOICE: Energetic, informative, community-focused. Use contractions. No em dashes.
Avoid: "ensure", "dive", "delve", "enhance", "game changer", "tapestry", "don't hesitate", "embark", "journey", "excited", "crucial"

RULES:
- Write a compelling subject line (under 60 characters)
- Address them by first name
- Include sections: Bake-Along Recap, New in the Classroom, Coming Up, Top Discussion
- Use emoji section headers (🍞 📚 🔥 💬)
- Use GENERAL share links for recipes
- Keep it 6-8 paragraphs
- Sign off: "See you in the classroom, Henry"

${recipeLinks ? `\nRECIPE LINKS (use these share links):\n${recipeLinks}` : ''}

OUTPUT FORMAT:
SUBJECT: [subject line]

[email body]`;

        userPrompt = `Write a weekly digest email to ${firstName}. Include placeholder content for bake-along recap, new courses, upcoming events, and top discussions.`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid campaign_type' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fullResponse = aiData.choices?.[0]?.message?.content?.trim() || '';

    // Parse subject and body
    let subject = '';
    let body = fullResponse;

    const subjectMatch = fullResponse.match(/^SUBJECT:\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      body = fullResponse.replace(subjectMatch[0], '').trim();
    }

    return new Response(
      JSON.stringify({ subject, body, campaign_type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
