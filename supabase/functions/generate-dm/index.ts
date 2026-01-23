import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `Generate a warm, personal DM to re-engage a bread baking community member.

Community: Crust & Crumb Academy (bread baking)
Tone: Henry's voice - warm, encouraging, personal, not salesy

Include:
- Personal greeting using their first name
- Reference what they said they wanted to learn (from application)
- One specific suggestion to get started (mention the classroom or a beginner resource)
- Invitation to share their first bake or ask questions

Keep it under 100 words
Sign off as Henry

Do not use: 'dive deep', 'journey', 'excited to have you', em dashes, 'embark', 'game changer'`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { member } = await req.json();

    if (!member) {
      return new Response(
        JSON.stringify({ error: 'Member data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate days since last activity
    let daysSinceActive = 'Unknown';
    if (member.last_active) {
      const lastActive = new Date(member.last_active);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysSinceActive = diffDays.toString();
    } else if (member.post_count === 0 && member.comment_count === 0) {
      daysSinceActive = 'Never active';
    }

    const userPrompt = `Member Info:
- Name: ${member.skool_name}
- Joined: ${member.join_date || 'Unknown'}
- Their goal when joining: "${member.application_answer || 'Not provided'}"
- Days since last activity: ${daysSinceActive}
- Posts: ${member.post_count || 0}, Comments: ${member.comment_count || 0}

Write a personalized re-engagement DM for this member.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'API credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate message' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'No message generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: message.trim() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-dm:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
