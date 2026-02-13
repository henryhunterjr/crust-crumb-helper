import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OutreachRule {
  id: string;
  rule_name: string;
  rule_type: string;
  condition_field: string;
  condition_operator: string;
  condition_value: number;
  action_type: string;
  action_value: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useOutreachRules() {
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['outreach-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outreach_rules')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as OutreachRule[];
    },
  });

  const addRule = useMutation({
    mutationFn: async (rule: Omit<OutreachRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('outreach_rules')
        .insert(rule)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-rules'] });
      toast.success('Rule added');
    },
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OutreachRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('outreach_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-rules'] });
      toast.success('Rule updated');
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outreach_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-rules'] });
      toast.success('Rule deleted');
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('outreach_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-rules'] });
    },
  });

  const evaluateRules = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('evaluate-rules', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['outreach-messages'] });
      toast.success(`Rules evaluated: ${data?.generated || 0} messages generated`);
    },
    onError: (e) => toast.error('Failed to evaluate rules: ' + e.message),
  });

  return { rules, isLoading, addRule, updateRule, deleteRule, toggleRule, evaluateRules };
}
