import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DMTemplate } from '@/types/dmTemplate';
import { OutreachType } from '@/types/member';

export function useDMTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['dm-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dm_templates')
        .select('*')
        .order('use_count', { ascending: false });
      
      if (error) throw error;
      return data as DMTemplate[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: {
      name: string;
      content: string;
      outreach_type: OutreachType;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('dm_templates')
        .insert({
          name: template.name,
          content: template.content,
          outreach_type: template.outreach_type,
          description: template.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DMTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { 
      id: string; 
      updates: Partial<Pick<DMTemplate, 'name' | 'content' | 'outreach_type' | 'description'>> 
    }) => {
      const { data, error } = await supabase
        .from('dm_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DMTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dm_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-templates'] });
    },
  });

  const incrementUseCount = useMutation({
    mutationFn: async (id: string) => {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      const { error } = await supabase
        .from('dm_templates')
        .update({
          use_count: (template.use_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-templates'] });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUseCount,
  };
}
