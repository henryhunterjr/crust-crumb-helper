// Shared AI personality settings loader for all edge functions
// Reads from ai_personality_settings table so UI changes take effect

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIPersonalitySettings {
  tone_description: string;
  avoided_words: string;
  use_contractions: string;
  no_em_dashes: string;
  vary_sentences: string;
  include_emoji: string;
  emoji_limit: string;
  end_with_encouragement: string;
  include_personal_story: string;
  dm_signoff: string;
  email_signoff: string;
  community_name: string;
  my_name: string;
  my_role: string;
  teaching_style: string;
  about_me: string;
}

const DEFAULTS: AIPersonalitySettings = {
  tone_description: 'Warm, direct, no-nonsense coach. Not a cheerleader, not a guru — a guide who\'s been there. Clear, confident, practical. Write like a smart person talking to another smart person. Encouraging but not corny. Use contractions naturally. Keep it concise.',
  avoided_words: 'ensure, dive, delve, enhance, game changer, tapestry, unveil, crucial, it\'s worth noting, arguably, in today\'s world, not only... but also, don\'t hesitate, embark, journey, excited, amazing, incredible, hack, secret, perfect loaf',
  use_contractions: 'true',
  no_em_dashes: 'true',
  vary_sentences: 'true',
  include_emoji: 'true',
  emoji_limit: '2',
  end_with_encouragement: 'true',
  include_personal_story: 'false',
  dm_signoff: 'You\'ve got this! 🍞',
  email_signoff: 'See you in the classroom, Henry',
  community_name: 'Crust & Crumb Academy',
  my_name: 'Henry Hunter Jr.',
  my_role: 'Founder & Head Baker',
  teaching_style: 'Coaching, not cheerleading. Perfection is not required, progress is. Read your dough, don\'t watch the clock. No gatekeeping. Honest feedback helps more than likes.',
  about_me: 'I\'m an artisan bread baker and cookbook author with 5 published books. I sold 80-90 loaves per market at my peak. I have 26 years in marketing and advertising (CBS and Fox). I learned bread from a German baker named Herr Sherman during my Army service. I run a 50,000+ member Facebook group and a 457+ member Skool Academy. My books include "Sourdough for the Rest of Us" and "From Oven to Market."',
};

/**
 * Fetch AI personality settings from Supabase, falling back to defaults.
 * Call this in each edge function instead of hardcoding voice instructions.
 */
export async function loadAISettings(supabase: SupabaseClient): Promise<AIPersonalitySettings> {
  try {
    const { data, error } = await supabase
      .from('ai_personality_settings')
      .select('setting_key, setting_value');

    if (error) {
      console.error('Failed to load AI settings, using defaults:', error.message);
      return { ...DEFAULTS };
    }

    const result = { ...DEFAULTS };
    if (data) {
      for (const row of data) {
        if (row.setting_key in result) {
          (result as any)[row.setting_key] = row.setting_value;
        }
      }
    }
    return result;
  } catch (err) {
    console.error('Error loading AI settings:', err);
    return { ...DEFAULTS };
  }
}

/**
 * Build a voice instruction block from settings for use in system prompts.
 */
export function buildVoiceBlock(settings: AIPersonalitySettings): string {
  const parts: string[] = [];

  parts.push(`VOICE: ${settings.my_name} — ${settings.tone_description}`);
  parts.push(`\nTeaching style: ${settings.teaching_style}`);
  parts.push(`\nCommunity: ${settings.community_name}`);

  if (settings.avoided_words) {
    parts.push(`\nAVOID these words/phrases: ${settings.avoided_words}`);
  }
  if (settings.no_em_dashes === 'true') {
    parts.push('\nDo not use em dashes (use commas or break the sentence).');
  }
  if (settings.use_contractions === 'true') {
    parts.push('\nUse contractions naturally.');
  }
  if (settings.include_emoji === 'true') {
    parts.push(`\nEmoji use: max ${settings.emoji_limit || '2'} per message, placed naturally.`);
  }

  return parts.join('');
}
