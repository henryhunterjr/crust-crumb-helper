import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AISettings {
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

const DEFAULTS: AISettings = {
  tone_description: 'Clear, confident, practical. Write like a smart person talking to another smart person. Encouraging but not corny. Use contractions naturally. Keep it concise. Say what needs to be said, then stop.',
  avoided_words: 'ensure, dive, delve, enhance, game changer, tapestry, unveil, crucial, it\'s worth noting, arguably, in today\'s world, not only... but also, don\'t hesitate, embark, journey, excited',
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
  my_name: 'Henry Hunter',
  my_role: 'Founder & Head Baker',
  teaching_style: 'Coaching, not cheerleading. Perfection is not required, progress is. Read your dough, don\'t watch the clock. No gatekeeping. Honest feedback helps more than likes.',
  about_me: 'I\'m an artisan bread baker and cookbook author. I sold 80-90 loaves per market at my peak. I have 26 years in marketing and advertising (CBS and Fox). I learned bread from a German baker named Herr Sherman during my Army service. I run a 50,000+ member Facebook group and a 288+ member Skool Academy. My books include "Sourdough for the Rest of Us" and "From Oven to Market."',
};

export function useAISettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULTS, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_personality_settings')
        .select('setting_key, setting_value');
      if (error) throw error;

      const result = { ...DEFAULTS };
      data?.forEach((row: any) => {
        if (row.setting_key in result) {
          (result as any)[row.setting_key] = row.setting_value;
        }
      });
      return result;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: Partial<AISettings>) => {
      const entries = Object.entries(newSettings);
      for (const [key, value] of entries) {
        const { data: existing } = await supabase
          .from('ai_personality_settings')
          .select('id')
          .eq('setting_key', key)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('ai_personality_settings')
            .update({ setting_value: value })
            .eq('setting_key', key);
        } else {
          await supabase
            .from('ai_personality_settings')
            .insert({ setting_key: key, setting_value: value });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      toast.success('AI settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  return { settings, isLoading, saveSettings, DEFAULTS };
}
