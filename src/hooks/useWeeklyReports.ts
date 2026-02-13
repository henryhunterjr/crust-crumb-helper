import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  report_data: Record<string, any>;
  health_score: number | null;
  generated_at: string;
}

export function useWeeklyReports() {
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['weekly-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as WeeklyReport[];
    },
  });

  const generateReport = useMutation({
    mutationFn: async ({ weekStart, weekEnd }: { weekStart: string; weekEnd: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { week_start: weekStart, week_end: weekEnd },
      });
      if (error) throw error;
      return data as WeeklyReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-reports'] });
      toast.success('Weekly report generated!');
    },
    onError: (e) => toast.error('Failed to generate report: ' + e.message),
  });

  return { reports, isLoading, generateReport };
}
