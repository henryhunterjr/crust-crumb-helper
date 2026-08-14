import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RosterSyncRun {
  id: string;
  community: string | null;
  status: string | null;
  captured_at: string | null;
  created_at: string;
  total_seen: number | null;
  inserted: number | null;
  updated: number | null;
  missing_flagged: number | null;
  error: string | null;
  full_roster: boolean | null;
}

export function useDataTrust() {
  const syncs = useQuery({
    queryKey: ['roster-sync-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roster_sync_runs')
        .select('id,community,status,captured_at,created_at,total_seen,inserted,updated,missing_flagged,error,full_roster')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as RosterSyncRun[];
    },
  });

  const events = useQuery({
    queryKey: ['skooly-webhook-health'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('skooly_webhook_events' as never)
        .select('*', { count: 'exact', head: true })
        .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (error) throw error;
      return count || 0;
    },
    retry: false,
  });

  const latestByCommunity = new Map<string, RosterSyncRun>();
  for (const run of syncs.data || []) {
    const key = run.community || 'unknown';
    if (!latestByCommunity.has(key)) latestByCommunity.set(key, run);
  }

  const latest = syncs.data?.[0];
  const latestTime = latest?.captured_at || latest?.created_at;
  const ageHours = latestTime ? (Date.now() - new Date(latestTime).getTime()) / 3_600_000 : Infinity;
  const isFresh = ageHours <= 26 && latest?.status === 'completed';

  return {
    isLoading: syncs.isLoading,
    error: syncs.error,
    latest,
    latestByCommunity: [...latestByCommunity.values()],
    isFresh,
    ageHours,
    webhookEvents24h: events.data,
    webhookConfigured: !events.error,
  };
}
