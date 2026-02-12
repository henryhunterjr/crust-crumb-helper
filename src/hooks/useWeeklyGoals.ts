import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, format } from 'date-fns';

export interface WeeklyGoal {
  id: string;
  week_start: string;
  goal_type: string;
  goal_label: string;
  target_count: number;
  current_count: number;
  created_at: string;
  updated_at: string;
}

export function useWeeklyGoals() {
  const queryClient = useQueryClient();
  const currentWeekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['weekly-goals', currentWeekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('week_start', currentWeekStart)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as WeeklyGoal[];
    },
  });

  const upsertGoal = useMutation({
    mutationFn: async (goal: {
      goal_type: string;
      goal_label: string;
      target_count: number;
      current_count?: number;
    }) => {
      // Check if goal exists for this week
      const { data: existing } = await supabase
        .from('weekly_goals')
        .select('id')
        .eq('week_start', currentWeekStart)
        .eq('goal_type', goal.goal_type)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('weekly_goals')
          .update({
            goal_label: goal.goal_label,
            target_count: goal.target_count,
            current_count: goal.current_count ?? 0,
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('weekly_goals')
          .insert({
            week_start: currentWeekStart,
            goal_type: goal.goal_type,
            goal_label: goal.goal_label,
            target_count: goal.target_count,
            current_count: goal.current_count ?? 0,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
    },
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, current_count }: { id: string; current_count: number }) => {
      const { error } = await supabase
        .from('weekly_goals')
        .update({ current_count })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-goals'] });
    },
  });

  return { goals, isLoading, upsertGoal, updateProgress, currentWeekStart };
}
