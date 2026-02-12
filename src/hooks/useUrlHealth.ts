import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UrlHealthCheck {
  id: string;
  url: string;
  source_type: string;
  source_id: string | null;
  status_code: number | null;
  is_healthy: boolean;
  last_checked_at: string | null;
  error_message: string | null;
  fallback_url: string | null;
  created_at: string;
}

export function useUrlHealth() {
  const queryClient = useQueryClient();

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['url-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('url_health_checks')
        .select('*')
        .order('last_checked_at', { ascending: false });
      if (error) throw error;
      return data as UrlHealthCheck[];
    },
  });

  const verifyUrls = useMutation({
    mutationFn: async (urls: string[]) => {
      const { data, error } = await supabase.functions.invoke('verify-url', {
        body: { urls },
      });
      if (error) throw error;

      // Upsert results into url_health_checks
      if (data?.results) {
        for (const result of data.results) {
          await supabase
            .from('url_health_checks')
            .upsert(
              {
                url: result.url,
                is_healthy: result.is_healthy,
                status_code: result.status_code,
                error_message: result.error_message,
                last_checked_at: new Date().toISOString(),
                source_type: 'manual',
              },
              { onConflict: 'url' }
            );
        }
      }

      return data.results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['url-health'] });
    },
  });

  const stats = {
    total: checks.length,
    healthy: checks.filter(c => c.is_healthy).length,
    broken: checks.filter(c => !c.is_healthy && c.last_checked_at).length,
    unchecked: checks.filter(c => !c.last_checked_at).length,
  };

  return { checks, isLoading, verifyUrls, stats };
}
