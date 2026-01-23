import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are helping Henry Hunter Jr. write posts for his bread baking community "Crust & Crumb Academy" on Skool.

Henry's voice:
- Warm, encouraging, slightly masculine tone
- Uses "perfection not required" philosophy
- Avoids corporate marketing speak
- Speaks from experience, not theory
- Uses contractions naturally
- References common struggles home bakers face

Post guidelines:
- Always include a relevant emoji in the title
- Keep posts scannable but personal
- End with a clear call to action or question
- Never use: "dive deep", "game changer", "crucial", "embark", "journey", or em dashes

Generate 3 variations of the requested post type for the given topic. Each should have:
- title: Under 80 characters, includes emoji
- content: 100-200 words

Return ONLY valid JSON in this exact format:
{
  "posts": [
    {"title": "...", "content": "..."},
    {"title": "...", "content": "..."},
    {"title": "...", "content": "..."}
  ]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, postType, targetAudience } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const audienceGuidance = {
      'new': 'Write for new bakers - keep it simple, encouraging, and avoid jargon.',
      'intermediate': 'Write for intermediate bakers - focus on technique refinement and troubleshooting.',
      'advanced': 'Write for advanced bakers - include science, detailed troubleshooting, and nuance.',
      'everyone': 'Write for all skill levels - be inclusive and welcoming.'
    };

    const userPrompt = `Create a "${postType}" post about: ${topic}

Target audience: ${audienceGuidance[targetAudience as keyof typeof audienceGuidance] || audienceGuidance['everyone']}

Remember to match Henry's warm, encouraging voice and end each post with a clear call to action or question.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate posts");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-post error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
