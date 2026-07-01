import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRef, useState } from 'react';

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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Stats strip — last classifier run + members updated. Reads the
  // segment_refresh_log table populated by refresh_member_segments().
  const { data: lastRun } = useQuery({
    queryKey: ['segment_refresh_log_latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segment_refresh_log' as any)
        .select('ran_at, members_updated, pro_members_updated, source')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as {
        ran_at: string;
        members_updated: number;
        pro_members_updated: number;
        source: string | null;
      } | null;
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
      await qc.invalidateQueries({ queryKey: ['segment_refresh_log_latest'] });
    } catch (e: any) {
      toast.error(e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // ---------------------------------------------------------------------
  // Wingman tag CSV importer.
  // Accepts a CSV with two columns: email, tags (tags are comma or
  // semicolon separated). Merges into members.wingman_tags append-only,
  // then triggers a segment refresh. Missing emails are logged, not
  // errors — they're just members Wingman knows about that Skool doesn't.
  // ---------------------------------------------------------------------
  const handleWingmanCsv = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV is empty');
      const header = lines[0].toLowerCase();
      const hasHeader = header.includes('email');
      const rows = hasHeader ? lines.slice(1) : lines;

      const wanted: { email: string; tags: string[] }[] = [];
      for (const raw of rows) {
        // Split on the first comma so a tag list can contain commas when
        // it's wrapped in quotes or uses semicolons.
        const firstComma = raw.indexOf(',');
        if (firstComma < 0) continue;
        const email = raw.slice(0, firstComma).trim().toLowerCase().replace(/^"|"$/g, '');
        const tagsField = raw.slice(firstComma + 1).trim().replace(/^"|"$/g, '');
        if (!email || !tagsField) continue;
        const tags = tagsField
          .split(/[;,]/)
          .map((t) => t.trim().toLowerCase().replace(/\s+/g, '_'))
          .filter(Boolean);
        if (tags.length > 0) wanted.push({ email, tags });
      }
      if (wanted.length === 0) throw new Error('No usable rows in CSV');

      // Batch-fetch matching members so we can append without wiping.
      const emails = [...new Set(wanted.map((w) => w.email))];
      const { data: existing, error: fetchErr } = await supabase
        .from('members')
        .select('id, email, wingman_tags')
        .in('email', emails);
      if (fetchErr) throw fetchErr;

      const byEmail = new Map<string, { id: string; wingman_tags: string[] }>();
      for (const m of existing || []) {
        byEmail.set((m.email || '').toLowerCase(), {
          id: m.id,
          wingman_tags: m.wingman_tags || [],
        });
      }

      let updated = 0;
      let missing = 0;
      for (const row of wanted) {
        const m = byEmail.get(row.email);
        if (!m) { missing++; continue; }
        const merged = Array.from(new Set([...(m.wingman_tags || []), ...row.tags]));
        // Skip write when nothing changed.
        if (merged.length === m.wingman_tags.length) continue;
        const { error: updErr } = await supabase
          .from('members')
          .update({ wingman_tags: merged })
          .eq('id', m.id);
        if (updErr) throw updErr;
        updated++;
      }

      toast.success(
        `Wingman tags: ${updated} member${updated === 1 ? '' : 's'} updated` +
          (missing ? `, ${missing} email${missing === 1 ? '' : 's'} not in roster` : ''),
      );

      // Kick a segment refresh so the new tags show up immediately.
      const { error: refErr } = await supabase.rpc('refresh_member_segments' as any);
      if (refErr) throw refErr;
      await qc.invalidateQueries({ queryKey: ['segment_counts'] });
      await qc.invalidateQueries({ queryKey: ['segment_refresh_log_latest'] });
    } catch (e: any) {
      toast.error(e.message || 'Wingman import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleWingmanCsv(f);
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Wingman tags
            </Button>
            <Button onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh now
            </Button>
          </div>
        </div>

        {/* Classifier stats strip — pipeline heartbeat without digging into cron logs. */}
        <Card>
          <CardContent className="py-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Last classifier run</p>
              <p className="font-mono">
                {lastRun?.ran_at
                  ? new Date(lastRun.ran_at).toLocaleString()
                  : 'No runs logged yet'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Records updated last run</p>
              <p className="font-mono">
                {lastRun ? `${lastRun.members_updated} members / ${lastRun.pro_members_updated} pro` : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Next scheduled run</p>
              <p className="font-mono">Daily · 03:15 UTC</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Wingman CSV format: two columns <span className="font-mono">email,tags</span>. Tags are comma or
          semicolon separated (e.g. <span className="font-mono">super_engaged;leads</span>). Tags are merged
          into <span className="font-mono">wingman_tags</span>, existing values are preserved.
        </p>

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