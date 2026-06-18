import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HermesJob, HermesJobRun } from '@/types/hermes';
import { toast } from 'sonner';

export function useHermesJobs() {
  return useQuery({
    queryKey: ['hermes_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hermes_jobs' as any)
        .select('*')
        .order('display_name');
      if (error) throw error;
      return (data || []) as unknown as HermesJob[];
    },
  });
}

export function useHermesJobRuns(jobId?: string) {
  return useQuery({
    queryKey: ['hermes_job_runs', jobId || 'all'],
    queryFn: async () => {
      let q = supabase.from('hermes_job_runs' as any).select('*').order('started_at', { ascending: false }).limit(50);
      if (jobId) q = q.eq('job_id', jobId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as HermesJobRun[];
    },
  });
}

export function useToggleHermesJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('hermes_jobs' as any).update({ enabled }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hermes_jobs'] });
      toast.success('Job updated');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to update job'),
  });
}

export function useRunHermesJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, dryRun }: { jobId: string; dryRun: boolean }) => {
      const { data, error } = await supabase.functions.invoke('hermes-run', {
        body: { job_id: jobId, trigger: dryRun ? 'preview' : 'manual', dry_run: dryRun },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['hermes_jobs'] });
      qc.invalidateQueries({ queryKey: ['hermes_job_runs'] });
      if (!vars.dryRun) toast.success(data?.summary || 'Job finished');
    },
    onError: (err: any) => toast.error(err?.message || 'Job failed'),
  });
}