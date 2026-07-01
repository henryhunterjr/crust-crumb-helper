import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type OutreachChannel = 'email' | 'skool_dm' | 'both';

export interface OutreachTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  channel: OutreachChannel;
  segment_key: string | null;
  subject: string | null;
  body: string;
  merge_tags: string[];
  daily_cap: number;
  dedupe_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useOutreachTemplates() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['outreach_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_templates' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OutreachTemplate[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (t: Partial<OutreachTemplate> & { key: string; name: string; body: string }) => {
      const payload: any = { ...t };
      if (t.id) {
        const { error } = await supabase.from('outreach_templates' as any).update(payload).eq('id', t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('outreach_templates' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach_templates'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outreach_templates' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outreach_templates'] }),
  });

  return { ...query, upsert, remove };
}