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
  skool_url: string | null;
}

interface InterestMapping {
  id: string;
  keywords: string[];
  recommended_course: string | null;
  recommended_recipe: string | null;
  quick_win: string | null;
  book_link: string | null;
}

interface MemberTag {
  tag: string;
  source: string;
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

function getSafeUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}

// Map interest tags to interest_mappings keywords
const tagToKeywordMap: Record<string, string[]> = {
  'sourdough-interested': ['sourdough', 'starter', 'levain', 'wild yeast'],
  'shaping-focused': ['shaping', 'scoring', 'presentation', 'ear'],
  'business-builder': ['sell', 'selling', 'market', 'farmers market', 'cottage', 'business'],
  'yeast-water': ['yeast water', 'fruit water', 'natural leavening'],
  'flavor-explorer': ['flavor', 'tang', 'sour', 'mild', 'fermentation'],
  'focaccia-fan': ['focaccia', 'flatbread', 'pizza'],
};

// Find interest mappings that match member tags
function findMappingsForTags(tags: string[], mappings: InterestMapping[]): InterestMapping[] {
  const matched: InterestMapping[] = [];
  
  for (const tag of tags) {
    const searchKeywords = tagToKeywordMap[tag];
    if (!searchKeywords) continue;
    
    for (const mapping of mappings) {
      if (matched.includes(mapping)) continue;
      
      const hasOverlap = mapping.keywords.some(mk => 
        searchKeywords.some(sk => 
          mk.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(mk.toLowerCase())
        )
      );
      
      if (hasOverlap) {
        matched.push(mapping);
      }
    }
  }
  
  return matched;
}

// Find matching resources based on member tags + interest mappings + application answer
function findMatchingResources(
  applicationAnswer: string | null,
  resources: ClassroomResource[],
  tagMappings: InterestMapping[]
): ClassroomResource[] {
  const scoredResources = resources.map(resource => {
    let score = 0;
    
    // Boost resources recommended by interest mappings
    for (const mapping of tagMappings) {
      if (mapping.recommended_course && 
          resource.title.toLowerCase().includes(mapping.recommended_course.toLowerCase())) {
        score += 10;
      }
    }
    
    // Keyword matching from application answer
    if (applicationAnswer) {
      const memberKeywords = extractKeywords(applicationAnswer);
      
      if (resource.keywords) {
        for (const keyword of resource.keywords) {
          if (memberKeywords.includes(keyword.toLowerCase())) score += 3;
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

// Find matching recipes based on member tags + interest mappings + application answer
function findMatchingRecipes(
  applicationAnswer: string | null,
  recipes: Recipe[],
  tagMappings: InterestMapping[]
): Recipe[] {
  const scoredRecipes = recipes.map(recipe => {
    let score = 0;
    
    // Boost recipes recommended by interest mappings
    for (const mapping of tagMappings) {
      if (mapping.recommended_recipe && 
          recipe.title.toLowerCase().includes(mapping.recommended_recipe.toLowerCase())) {
        score += 10;
      }
    }
    
    if (applicationAnswer) {
      const memberKeywords = extractKeywords(applicationAnswer);
      const lowerAnswer = applicationAnswer.toLowerCase();
      
      const breadTypes = [
        'bagel', 'focaccia', 'baguette', 'challah', 'ciabatta', 'brioche', 'pizza',
        'pita', 'cinnamon roll', 'english muffin', 'bread bowl', 'cracker', 'pancake',
        'babka', 'danish', 'scone', 'doughnut', 'donut', 'muffin', 'roll', 'bun',
        'rye', 'sourdough', 'yeasted', 'gluten-free', 'gluten free', 'whole wheat',
        'milk bread', 'shokupan', 'king cake', 'banana bread', 'pumpkin', 'blueberry',
        'cranberry', 'walnut', 'chocolate', 'cheddar', 'jalapeño', 'jalapeno'
      ];
      
      const mentionedTypes = breadTypes.filter(type => lowerAnswer.includes(type));
      
      for (const type of mentionedTypes) {
        if (recipe.title.toLowerCase().includes(type)) score += 5;
        if (recipe.keywords?.some(k => k.toLowerCase().includes(type))) score += 4;
      }
      
      if (recipe.keywords) {
        for (const keyword of recipe.keywords) {
          if (memberKeywords.includes(keyword.toLowerCase())) score += 3;
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
  
  return resources.map(r => {
    const safeUrl = getSafeUrl(r.url);
    return `- "${r.title}" (${r.category}, ${r.skill_level}): ${r.description || 'No description'} | URL: ${safeUrl || '(none)'}`;
  }).join('\n');
}

// Format recipes for the prompt
function formatRecipesForPrompt(recipes: Recipe[]): string {
  if (recipes.length === 0) {
    return 'No specific recipes available.';
  }
  
  return recipes.map(r => {
    const safeUrl = getSafeUrl(r.skool_url || r.url);
    return `- "${r.title}" (${r.category}, ${r.skill_level}): ${r.description || 'No description'} | URL: ${safeUrl || '(none)'}`;
  }).join('\n');
}

// Format tag-based recommendations for the prompt
function formatTagRecommendations(tagMappings: InterestMapping[]): string {
  if (tagMappings.length === 0) return '';
  
  const parts = tagMappings.map(m => {
    const items: string[] = [];
    if (m.recommended_course) items.push(`Course: "${m.recommended_course}"`);
    if (m.recommended_recipe) items.push(`Recipe: "${m.recommended_recipe}"`);
    if (m.quick_win) items.push(`Quick win: ${m.quick_win}`);
    if (m.book_link) items.push(`Book link: ${m.book_link}`);
    return `Keywords [${m.keywords.join(', ')}]: ${items.join(' | ')}`;
  });
  
  return `\n\nTAG-BASED RECOMMENDATIONS (prioritize these):\n${parts.join('\n')}`;
}

// Detect interest type for link recommendations
function detectInterestType(applicationAnswer: string | null): { starterInterest: boolean; recipeInterest: boolean } {
  if (!applicationAnswer) return { starterInterest: false, recipeInterest: false };
  
  const lowerAnswer = applicationAnswer.toLowerCase();
  
  const starterKeywords = [
    'starter', 'sourdough starter', 'getting started', 'begin', 'new to sourdough',
    'starting', 'start sourdough', 'levain', 'mother dough', 'wild yeast',
    'feeding', 'maintain', 'troubleshoot starter', 'starter help', 'build a starter'
  ];
  
  const recipeKeywords = [
    'recipe', 'bake', 'make', 'bread', 'loaf', 'bagel', 'focaccia', 'baguette',
    'challah', 'ciabatta', 'brioche', 'pizza', 'rolls', 'croissant', 'pastry',
    'cinnamon roll', 'sourdough bread', 'artisan', 'rustic', 'boule', 'batard'
  ];
  
  const starterInterest = starterKeywords.some(kw => lowerAnswer.includes(kw));
  const recipeInterest = recipeKeywords.some(kw => lowerAnswer.includes(kw));
  
  return { starterInterest, recipeInterest };
}

// Generate welcome message prompt
function getWelcomeMessagePrompt(
  hasApplicationAnswer: boolean,
  resourcesForPrompt: string,
  recipesForPrompt: string,
  starterInterest: boolean,
  recipeInterest: boolean,
  tagRecommendations: string,
  memberTags: string[]
): string {
  let linkInstructions = '';
  
  if (starterInterest) {
    linkInstructions += `\n- IMPORTANT: Include this link to our Starter Sorcerer companion app: https://starter-sorcerer.vercel.app/ - mention it helps track and care for their sourdough starter`;
  }
  if (recipeInterest) {
    linkInstructions += `\n- IMPORTANT: Include this link to our Recipe Pantry: https://pantry.bakinggreatbread.com/ - mention it has all our tested recipes`;
  }
  if (!starterInterest && !recipeInterest && !hasApplicationAnswer) {
    linkInstructions = `\n- Include our Starter Sorcerer companion app (https://starter-sorcerer.vercel.app/) for starter help
- Include our Recipe Pantry (https://pantry.bakinggreatbread.com/) for recipes`;
  }

  const tagContext = memberTags.length > 0 
    ? `\nMember's interest tags: [${memberTags.join(', ')}] — use these to personalize the recommendation.` 
    : '';

  return `Generate a warm welcome DM for a new bread baking community member.

Community: Crust & Crumb Academy (bread baking)
Tone: Henry's voice - warm, welcoming, like greeting a new friend joining your kitchen.
${tagContext}

Available Classroom Resources (recommend beginner-friendly ones):
${resourcesForPrompt}

Available Recipes (recommend easy starter recipes):
${recipesForPrompt}
${tagRecommendations}

Instructions:
- Warmly welcome them by first name
${hasApplicationAnswer 
  ? '- Acknowledge what they said they wanted to learn or make\n- Point them to 1-2 specific resources/recipes that match their goals and tags'
  : '- Since no specific goals mentioned, suggest our most popular beginner resources'}${linkInstructions}
 - Only include a URL if it is explicitly shown next to an item in the lists above (e.g. "URL: https://...").
 - If an item shows "URL: (none)", do NOT invent a link—just mention the exact title so they can find it in the Classroom/Recipe Pantry.
- Invite them to introduce themselves in the community
- Encourage them to ask questions anytime
- Keep it under 120 words
- Sign off as Henry

Do not use: 'dive deep', 'journey', 'excited to have you', 'don't hesitate', em dashes, 'embark', 'game changer'`;
}

// Generate resource recommendation prompt
function getResourceRecommendationPrompt(
  hasApplicationAnswer: boolean,
  resourcesForPrompt: string,
  recipesForPrompt: string,
  starterInterest: boolean,
  recipeInterest: boolean,
  tagRecommendations: string,
  memberTags: string[]
): string {
  let linkInstructions = '';
  
  if (starterInterest) {
    linkInstructions += `\n- IMPORTANT: Include this link to our Starter Sorcerer companion app: https://starter-sorcerer.vercel.app/ - it helps track feedings, diagnose issues, and care for their starter`;
  }
  if (recipeInterest) {
    linkInstructions += `\n- IMPORTANT: Include this link to our Recipe Pantry: https://pantry.bakinggreatbread.com/ - it has all our tested recipes organized by skill level`;
  }

  const tagContext = memberTags.length > 0 
    ? `\nMember's interest tags: [${memberTags.join(', ')}] — use these to tailor your recommendations. Prioritize resources that match their tags.` 
    : '';

  return `Generate a warm, personal DM to a bread baking community member recommending resources.

Community: Crust & Crumb Academy (bread baking)
Tone: Henry's voice - warm, encouraging, personal, like a friend checking in. Not salesy or corporate.
${tagContext}

Available Classroom Resources (recommend if they want to LEARN something):
${resourcesForPrompt}

Available Recipes (recommend if they mention wanting to MAKE a specific bread):
${recipesForPrompt}
${tagRecommendations}

Instructions:
- Analyze what the member said they want to learn or make, combined with their interest tags
- If tag-based recommendations are provided above, prioritize those courses and recipes
- If they mention a specific bread type (bagels, focaccia, sourdough, etc.), check if we have that recipe and recommend it
- If they want to learn technique or troubleshoot, recommend a classroom resource
- You can recommend BOTH a recipe AND a classroom resource if relevant
${hasApplicationAnswer 
  ? '- Reference what they said they wanted to learn or make\n- Match them to specific resources and/or recipes from the lists above'
  : '- Since their application answer is empty/vague, recommend beginner sourdough resources\n- Use a warm, welcoming tone for someone just getting started'}${linkInstructions}
- Write the DM with:
  - Personal greeting using their first name
  - ${hasApplicationAnswer ? 'Reference what they said they wanted to learn or make' : 'Welcome them warmly and acknowledge they are new'}
   - Recommend specific resources/recipes by name. Only include URLs that are explicitly provided in the lists above.
   - If an item shows "URL: (none)", do NOT invent a link—just mention the exact title so they can find it in the Classroom/Recipe Pantry.
  - Invitation to ask questions or share their progress
- Keep it under 130 words
- Sign off as Henry

Do not use: 'dive deep', 'journey', 'excited to have you', 'don't hesitate', em dashes, 'embark', 'game changer'`;
}

// Generate feedback request prompt
function getFeedbackRequestPrompt(hasApplicationAnswer: boolean, memberTags: string[]): string {
  const tagContext = memberTags.length > 0 
    ? `\nMember's interest tags: [${memberTags.join(', ')}] — reference their interests naturally in the check-in.` 
    : '';

  return `Generate a warm, personal check-in DM to a bread baking community member asking for their feedback.

Community: Crust & Crumb Academy (bread baking)
Tone: Genuine care, not marketing. Like a community leader who actually wants to know how to help.
${tagContext}

Instructions:
Write a DM that:
- Greets them warmly by first name
- Acknowledges you're just checking in (without guilt-tripping about activity)
${hasApplicationAnswer 
  ? '- Briefly references what they originally said they wanted to learn (if available)'
  : '- Welcomes them warmly as a member'}
- Asks 1-2 simple questions from these options:
  - Is the academy meeting your expectations?
  - What would you like to see more of?
  - Is there something specific you're struggling with?
- Makes it easy to reply (no pressure, genuine curiosity)
- Keep it under 100 words
- Sign off as Henry

Do not use: 'we miss you', 'dive deep', 'journey', 'excited', 'don't hesitate', em dashes, any guilt-tripping language`;
}

// Generate custom topic prompt
function getCustomTopicPrompt(customTopic: string, hasApplicationAnswer: boolean, memberTags: string[]): string {
  const tagContext = memberTags.length > 0 
    ? `\nMember's interest tags: [${memberTags.join(', ')}] — weave their interests into the message if relevant.` 
    : '';

  return `Generate a personal DM for a bread baking community member.

Community: Crust & Crumb Academy (bread baking)
Tone: Personal, warm, like a friend reaching out. Not automated or corporate.
${tagContext}

Purpose of this DM: ${customTopic}

Instructions:
Write a DM that:
- Greets them by first name
- Addresses the specific purpose naturally
${hasApplicationAnswer 
  ? '- References their learning goals if relevant to the topic'
  : ''}
- Keep it under 100 words
- Sign off as Henry

Do not use: 'dive deep', 'journey', 'don't hesitate', em dashes, corporate language`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { member, outreach_type = 'resource_recommendation', custom_topic = '' } = await req.json();

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

    let systemPrompt: string;
    let matchedResources: ClassroomResource[] = [];
    let matchedRecipes: Recipe[] = [];
    let memberTags: string[] = [];
    let tagMappings: InterestMapping[] = [];
    let tagRecommendations = '';

    // Determine if we need to fetch resources
    const needsResources = outreach_type === 'welcome_message' || outreach_type === 'resource_recommendation';

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Fetch member tags and interest mappings in parallel with resources
      const queries: Promise<any>[] = [
        supabase.from('member_tags').select('tag, source').eq('member_id', member.id),
        supabase.from('interest_mappings').select('*'),
      ];
      
      if (needsResources) {
        queries.push(
          supabase.from('classroom_resources').select('*'),
          supabase.from('recipes').select('*')
        );
      }
      
      const results = await Promise.all(queries);
      
      // Process member tags
      const tagsResult = results[0];
      if (tagsResult.data) {
        memberTags = tagsResult.data.map((t: MemberTag) => t.tag);
      }
      
      // Process interest mappings
      const mappingsResult = results[1];
      if (mappingsResult.data) {
        // Find mappings that match member's interest tags
        tagMappings = findMappingsForTags(memberTags, mappingsResult.data);
        tagRecommendations = formatTagRecommendations(tagMappings);
      }
      
      if (needsResources) {
        const resourcesResult = results[2];
        const recipesResult = results[3];
        
        if (resourcesResult?.data && resourcesResult.data.length > 0) {
          matchedResources = findMatchingResources(member.application_answer, resourcesResult.data, tagMappings);
        }
        
        if (recipesResult?.data && recipesResult.data.length > 0) {
          matchedRecipes = findMatchingRecipes(member.application_answer, recipesResult.data, tagMappings);
        }
      }
    }

    const resourcesForPrompt = formatResourcesForPrompt(matchedResources);
    const recipesForPrompt = formatRecipesForPrompt(matchedRecipes);

    // Detect interest type for link recommendations
    const { starterInterest, recipeInterest } = detectInterestType(member.application_answer);

    // Select the appropriate prompt based on outreach type
    switch (outreach_type) {
      case 'welcome_message':
        systemPrompt = getWelcomeMessagePrompt(hasApplicationAnswer, resourcesForPrompt, recipesForPrompt, starterInterest, recipeInterest, tagRecommendations, memberTags);
        break;
      case 'feedback_request':
        systemPrompt = getFeedbackRequestPrompt(hasApplicationAnswer, memberTags);
        break;
      case 'custom':
        if (!custom_topic.trim()) {
          return new Response(
            JSON.stringify({ error: 'Custom topic is required for custom outreach type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        systemPrompt = getCustomTopicPrompt(custom_topic, hasApplicationAnswer, memberTags);
        break;
      case 'resource_recommendation':
      default:
        systemPrompt = getResourceRecommendationPrompt(hasApplicationAnswer, resourcesForPrompt, recipesForPrompt, starterInterest, recipeInterest, tagRecommendations, memberTags);
        break;
    }

    const tagsLine = memberTags.length > 0 ? `\n- Interest tags: [${memberTags.join(', ')}]` : '';

    const userPrompt = `Member Info:
- Name: ${member.skool_name}
- Joined: ${member.join_date || 'Unknown'}
- What they wanted to learn when joining: "${member.application_answer || 'Not provided'}"
- Days since last activity: ${daysSinceActive}
- Posts: ${member.post_count || 0}, Comments: ${member.comment_count || 0}${tagsLine}

Write a personalized DM for this member.`;

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
        outreach_type,
        matched_resources: matchedResources.map(r => r.title),
        matched_recipes: matchedRecipes.map(r => r.title),
        member_tags: memberTags,
        tag_recommendations: tagMappings.map(m => ({
          keywords: m.keywords,
          course: m.recommended_course,
          recipe: m.recommended_recipe,
          quick_win: m.quick_win,
        })),
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
