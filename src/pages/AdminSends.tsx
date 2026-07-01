// Audit log for every outreach send: who was targeted, which template,
// current status, error (if any), and whether it was triggered from the UI,
// via the API (Hermes/Claude), or by a scheduled system job.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  sending: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  sent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  delivered: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  responded: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  failed: 'bg-destructive/15 text-destructive',
  skipped: 'bg-muted text-muted-foreground',
  canceled: 'bg-muted text-muted-foreground line-through',
};

export default function AdminSends() {
  const [status, setStatus] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');
  const [triggeredBy, setTriggeredBy] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['outreach_sends', status, channel, triggeredBy],
    queryFn: async () => {
      let q = supabase
        .from('outreach_sends' as any)
        .select('id, template_key, segment_key, channel, recipient_name, recipient_email, recipient_skool_username, status, error, triggered_by, triggered_by_user, queued_at, sent_at, batch_id, attempts, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (status !== 'all') q = q.eq('status', status);
      if (channel !== 'all') q = q.eq('channel', channel);
      if (triggeredBy !== 'all') q = q.eq('triggered_by', triggeredBy);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return data || [];
    const s = search.toLowerCase();
    return (data || []).filter((r) =>
      [r.template_key, r.recipient_name, r.recipient_email, r.recipient_skool_username, r.error, r.triggered_by_user]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [data, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { total: (data || []).length };
    for (const r of data || []) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container flex-1 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Outreach sends</h1>
            <p className="text-muted-foreground text-sm">
              Every DM and email created by the bulk sender, the UI, or an API caller.
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} variant="outline">
            {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>

        <Card>
          <CardContent className="py-4 grid gap-4 sm:grid-cols-5 text-sm">
            {(['total','queued','sent','failed','responded'] as const).map((k) => (
              <div key={k}>
                <p className="text-muted-foreground text-xs uppercase tracking-wide">{k}</p>
                <p className="font-mono text-lg">{counts[k] || 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {['queued','sending','sent','delivered','responded','failed','skipped','canceled'].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="dm">DM</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={triggeredBy} onValueChange={setTriggeredBy}>
              <SelectTrigger><SelectValue placeholder="Triggered by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="ui">UI</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="hermes">Hermes</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search template, recipient, error…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground text-sm">No sends match these filters yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered by</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.template_key || '—'}</TableCell>
                        <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                        <TableCell className="text-sm">
                          <div>{r.recipient_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.recipient_email || r.recipient_skool_username || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] || ''}`}>
                            {r.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{r.triggered_by}</div>
                          {r.triggered_by_user && (
                            <div className="text-muted-foreground">{r.triggered_by_user}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[280px] truncate">
                          {r.error || ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}