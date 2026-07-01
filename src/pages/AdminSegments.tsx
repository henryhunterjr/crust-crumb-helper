import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

const SEGMENTS: { key: string; label: string; description: string }[] = [
  { key: 'cca_all', label: 'CCA — All', description: 'All Crust & Crumb Academy members.' },
  { key: 'cca_super_engaged', label: 'CCA — Super Engaged', description: 'Wingman tag "super_engaged".' },
  { key: 'cca_leads', label: 'CCA — Leads', description: 'Wingman tag "leads" (business-curious).' },
  { key: 'cca_customers', label: 'CCA — Customers', description: 'CCA members who bought a paid tier.' },
  { key: 'cca_not_yet_fotm', label: 'CCA → not yet FOTM', description: 'CCA members not in From Oven to Market yet.' },
  { key: 'fotm_all', label: 'FOTM — All', description: 'All From Oven to Market members.' },
  { key: 'fotm_founding', label: 'FOTM — Founding', description: 'Founding free-for-life tier.' },
  { key: 'fotm_paid_course', label: 'FOTM — Paid course', description: 'Premium ($497) or VIP ($997) buyers.' },
  { key: 'fotm_prospects', label: 'FOTM — Prospects', description: 'Leads captured, not enrolled yet.' },
  { key: 'newsletter_subscribers', label: 'Newsletter subscribers', description: 'Pantry newsletter list.' },
  { key: 'csv_upload', label: 'CSV upload', description: 'One-off uploaded lists for a specific send.' },
];

export default function AdminSegments() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: counts, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['segment_counts'],
    queryFn: async () => {
      const map: Record<string, number> = {};
      for (const s of SEGMENTS) {
        const { count } = await supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .contains('segments', [s.key]);
        map[s.key] = count || 0;
      }
      return map;
    },
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('refresh_member_segments' as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast.success(`Reclassified ${row?.members_updated ?? 0} members`);
      await qc.invalidateQueries({ queryKey: ['segment_counts'] });
    } catch (e: any) {
      toast.error(e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container flex-1 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Segments</h1>
            <p className="text-muted-foreground text-sm">
              Recomputed nightly at 3:15 AM UTC.
              {dataUpdatedAt && ` Last loaded ${new Date(dataUpdatedAt).toLocaleTimeString()}.`}
            </p>
          </div>
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh now
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {SEGMENTS.map(s => (
              <Card key={s.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <Badge variant="secondary" className="text-base font-mono">{counts?.[s.key] ?? 0}</Badge>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{s.key}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}