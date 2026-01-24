import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClassroomResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
}

interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  const stopWords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
    'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
    'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
    'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
    'don', 'should', 'now', 'want', 'would', 'like', 'get', 'make', 'learn',
    'try', 'know', 'think', 'really', 'also', 'even', 'well', 'much', 'way'
  ]);
  
  return text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Find matching resources based on member's application answer
function findMatchingResources(
  applicationAnswer: string | null,
  resources: ClassroomResource[]
): ClassroomResource[] {
  if (!applicationAnswer || resources.length === 0) {
    return resources
      .filter(r => r.skill_level === 'beginner')
      .slice(0, 5);
  }
  
  const memberKeywords = extractKeywords(applicationAnswer);
  
  const scoredResources = resources.map(resource => {
    let score = 0;
    
    if (resource.keywords) {
      for (const keyword of resource.keywords) {
        if (memberKeywords.includes(keyword.toLowerCase())) {
          score += 3;
        }
        for (const memberKeyword of memberKeywords) {
          if (keyword.toLowerCase().includes(memberKeyword) || 
              memberKeyword.includes(keyword.toLowerCase())) {
            score += 1;
          }
        }
      }
    }
    
    const titleWords = extractKeywords(resource.title);
    const descWords = resource.description ? extractKeywords(resource.description) : [];
    
    for (const memberKeyword of memberKeywords) {
      if (titleWords.includes(memberKeyword)) score += 2;
      if (descWords.includes(memberKeyword)) score += 1;
    }
    
    if (resource.skill_level === 'beginner') score += 0.5;
    
    return { resource, score };
  });
  
  const matches = scoredResources
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.resource);
  
  if (matches.length === 0) {
    return resources
      .filter(r => r.skill_level === 'beginner')
      .slice(0, 5);
  }
  
  return matches;
}

// Find matching recipes based on member's application answer
function findMatchingRecipes(
  applicationAnswer: string | null,
  recipes: Recipe[]
): Recipe[] {
  if (!applicationAnswer || recipes.length === 0) {
    return recipes
      .filter(r => r.skill_level === 'beginner')
      .slice(0, 3);
  }
  
  const memberKeywords = extractKeywords(applicationAnswer);
  const lowerAnswer = applicationAnswer.toLowerCase();
  
  // Check for specific bread type mentions
  const breadTypes = [
    'bagel', 'focaccia', 'baguette', 'challah', 'ciabatta', 'brioche', 'pizza',
    'pita', 'cinnamon roll', 'english muffin', 'bread bowl', 'cracker', 'pancake',
    'babka', 'danish', 'scone', 'doughnut', 'donut', 'muffin', 'roll', 'bun',
    'rye', 'sourdough', 'yeasted', 'gluten-free', 'gluten free', 'whole wheat',
    'milk bread', 'shokupan', 'king cake', 'banana bread', 'pumpkin', 'blueberry',
    'cranberry', 'walnut', 'chocolate', 'cheddar', 'jalapeño', 'jalapeno'
  ];
  
  const mentionedTypes = breadTypes.filter(type => lowerAnswer.includes(type));
  
  const scoredRecipes = recipes.map(recipe => {
    let score = 0;
    
    // High score for direct bread type mention
    for (const type of mentionedTypes) {
      if (recipe.title.toLowerCase().includes(type)) score += 5;
      if (recipe.keywords?.some(k => k.toLowerCase().includes(type))) score += 4;
    }
    
    if (recipe.keywords) {
      for (const keyword of recipe.keywords) {
        if (memberKeywords.includes(keyword.toLowerCase())) {
          score += 3;
        }
        for (const memberKeyword of memberKeywords) {
          if (keyword.toLowerCase().includes(memberKeyword) || 
              memberKeyword.includes(keyword.toLowerCase())) {
            score += 1;
          }
        }
      }
    }
    
    const titleWords = extractKeywords(recipe.title);
    const descWords = recipe.description ? extractKeywords(recipe.description) : [];
    
    for (const memberKeyword of memberKeywords) {
      if (titleWords.includes(memberKeyword)) score += 2;
      if (descWords.includes(memberKeyword)) score += 1;
    }
    
    if (recipe.skill_level === 'beginner') score += 0.5;
    
    return { recipe, score };
  });
  
  const matches = scoredRecipes
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.recipe);
  
  if (matches.length === 0) {
    return recipes
      .filter(r => r.skill_level === 'beginner')
      .slice(0, 3);
  }
  
  return matches;
}

// Format resources for the prompt
function formatResourcesForPrompt(resources: ClassroomResource[]): string {
  if (resources.length === 0) {
    return 'No specific classroom resources available.';
  }
  
  return resources.map(r => 
    `- "${r.title}" (${r.category}, ${r.skill_level}): ${r.description || 'No description'}${r.url ? ` - ${r.url}` : ''}`
  ).join('\n');
}

// Format recipes for the prompt
function formatRecipesForPrompt(recipes: Recipe[]): string {
  if (recipes.length === 0) {
    return 'No specific recipes available.';
  }
  
  return recipes.map(r => 
    `- "${r.title}" (${r.category}, ${r.skill_level}): ${r.description || 'No description'}${r.url ? ` - ${r.url}` : ''}`
  ).join('\n');
}

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch classroom resources and recipes
    let matchedResources: ClassroomResource[] = [];
    let matchedRecipes: Recipe[] = [];
    
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const [resourcesResult, recipesResult] = await Promise.all([
        supabase.from('classroom_resources').select('*'),
        supabase.from('recipes').select('*')
      ]);
      
      if (resourcesResult.data && resourcesResult.data.length > 0) {
        matchedResources = findMatchingResources(member.application_answer, resourcesResult.data);
      }
      
      if (recipesResult.data && recipesResult.data.length > 0) {
        matchedRecipes = findMatchingRecipes(member.application_answer, recipesResult.data);
      }
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

    const hasApplicationAnswer = member.application_answer && member.application_answer.trim().length > 0;
    const resourcesForPrompt = formatResourcesForPrompt(matchedResources);
    const recipesForPrompt = formatRecipesForPrompt(matchedRecipes);

    const systemPrompt = `Generate a warm, personal DM to re-engage a bread baking community member.

Community: Crust & Crumb Academy (bread baking)
Tone: Henry's voice - warm, encouraging, personal, like a friend checking in. Not salesy or corporate.

Available Classroom Resources (recommend if they want to LEARN something):
${resourcesForPrompt}

Available Recipes (recommend if they mention wanting to MAKE a specific bread):
${recipesForPrompt}

Instructions:
- Analyze what the member said they want to learn or make
- If they mention a specific bread type (bagels, focaccia, sourdough, etc.), check if we have that recipe and recommend it
- If they want to learn technique or troubleshoot, recommend a classroom resource
- You can recommend BOTH a recipe AND a classroom resource if relevant
${hasApplicationAnswer 
  ? '- Reference what they said they wanted to learn or make\n- Match them to specific resources and/or recipes from the lists above'
  : '- Since their application answer is empty/vague, recommend beginner sourdough resources\n- Use a warm, welcoming tone for someone just getting started'}
- Write the DM with:
  - Personal greeting using their first name
  - ${hasApplicationAnswer ? 'Reference what they said they wanted to learn or make' : 'Welcome them warmly and acknowledge they are new'}
  - Recommend specific resources/recipes by name with the actual URL
  - Invitation to ask questions or share their progress
- Keep it under 130 words
- Sign off as Henry

Do not use: 'dive deep', 'journey', 'excited to have you', 'don't hesitate', em dashes, 'embark', 'game changer'`;

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
        max_tokens: 500,
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
      JSON.stringify({ 
        message: message.trim(),
        matched_resources: matchedResources.map(r => r.title),
        matched_recipes: matchedRecipes.map(r => r.title),
        has_application_answer: hasApplicationAnswer
      }),
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
