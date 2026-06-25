import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays, formatDistanceToNow } from 'date-fns';
import { Loader2, Mail, Send, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { Member, IntentTier } from '@/types/member';
import { MemberDetailDialog } from '@/components/members/MemberDetailDialog';
import { useMembers } from '@/hooks/useMembers';
import { toast } from 'sonner';
import { NURTURE_EMAILS, MAX_NURTURE_STEP } from '../../supabase/functions/_shared/nurture-emails';

type FreshnessFilter = 'all' | 'never_touched' | 'stale';
type TierFilter = 'all' | IntentTier;
type SortField = 'joined' | 'nurture_step' | 'last_touch';
type SortDir = 'asc' | 'desc';

function tierBadge(tier: IntentTier | null | undefined) {
  if (tier === 'curious') {
    return <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">curious</Badge>;
  }
  if (tier === 'prospect') {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">prospect</Badge>;
  }
  return <Badge variant="outline">unknown</Badge>;
}

async function fetchTargets(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .in('intent_tier', ['curious', 'prospect'])
    .eq('nurture_status', 'active')
    .order('join_date', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data || []) as Member[];
}

async function callFn(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as {
    ok: boolean;
    eligibleCount?: number;
    sent?: number;
    failed?: number;
    reason?: string;
    detail?: string;
    results?: Array<{ status: string; error?: string }>;
  };
}

export default function Targets() {
  const { updateMember, markOutreachResponded } = useMembers();
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [freshness, setFreshness] = useState<FreshnessFilter>('all');
  const [selected, setSelected] = useState<Member | null>(null);
  const [sortField, setSortField] = useState<SortField>('joined');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [dripBusy, setDripBusy] = useState(false);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: fetchTargets,
  });

  const copyReady = NURTURE_EMAILS.length === MAX_NURTURE_STEP;

  const filtered = useMemo(() => {
    const now = new Date();
    const list = targets.filter((m) => {
      if (tierFilter !== 'all' && m.intent_tier !== tierFilter) return false;
      if (freshness === 'never_touched' && m.last_business_touch) return false;
      if (freshness === 'stale') {
        if (!m.last_business_touch) return false;
        const days = differenceInDays(now, parseISO(m.last_business_touch));
        if (days <= 30) return false;
      }
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    const ts = (s: string | null | undefined) => (s ? new Date(s).getTime() : 0);
    return [...list].sort((a, b) => {
      if (sortField === 'nurture_step') return dir * ((a.nurture_step ?? 0) - (b.nurture_step ?? 0));
      if (sortField === 'last_touch') return dir * (ts(a.last_business_touch) - ts(b.last_business_touch));
      return dir * (ts(a.join_date) - ts(b.join_date));
    });
  }, [targets, tierFilter, freshness, sortField, sortDir]);

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const runDrip = async (dryRun: boolean) => {
    setDripBusy(true);
    try {
      const r = await callFn('nurture-drip-send', { dryRun });
      if (!r.ok) {
        toast.error(`Drip ${dryRun ? 'preview' : 'send'} failed: ${r.reason ?? 'unknown'}`);
        return;
      }
      if (dryRun) {
        toast.success(`${r.eligibleCount ?? 0} member(s) eligible for next send`);
      } else {
        toast.success(`Sent ${r.sent ?? 0}, failed ${r.failed ?? 0} (of ${r.eligibleCount ?? 0} eligible)`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'drip call failed');
    } finally {
      setDripBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container px-4 py-6 flex-1">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold text-foreground">Targets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Members who told us they want to monetize their baking. Curious and prospect tiers only.
            Hobbyists are never shown here and never receive business outreach.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Market-curious nurture drip (Resend)
            </CardTitle>
            <CardDescription>
              6-email sequence, one touch every 5 days, max 50 sends per run. Copy lives in
              <code className="mx-1">supabase/functions/_shared/nurture-emails.ts</code>.
              {copyReady
                ? ` All ${MAX_NURTURE_STEP} steps loaded.`
                : ` ${NURTURE_EMAILS.length}/${MAX_NURTURE_STEP} steps loaded — sends will fail until all 6 are filled in.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" disabled={dripBusy} onClick={() => runDrip(true)}>
              Preview eligible (dry-run)
            </Button>
            <Button disabled={dripBusy || !copyReady} onClick={() => runDrip(false)}>
              <Send className="h-4 w-4 mr-1" />
              Send next batch now
            </Button>
            {!copyReady && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Paste all 6 emails into nurture-emails.ts to enable sending.
              </span>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tier</span>
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as TierFilter)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="curious">Curious</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Freshness</span>
            <Select value={freshness} onValueChange={(v) => setFreshness(v as FreshnessFilter)}>
              <SelectTrigger className="w-[200px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="never_touched">Never touched</SelectItem>
                <SelectItem value="stale">Stale (over 30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {filtered.length} of {targets.length}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading targets...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                No targets match these filters yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('joined')}
                      >
                        Joined {sortField === 'joined' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Learn goal (Q1)</TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => toggleSort('nurture_step')}
                      >
                        Step {sortField === 'nurture_step' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => toggleSort('last_touch')}
                      >
                        Last touch {sortField === 'last_touch' && (sortDir === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow
                        key={m.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(m)}
                      >
                        <TableCell className="font-medium">{m.skool_name}</TableCell>
                        <TableCell>{tierBadge(m.intent_tier)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.email || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.join_date ? format(parseISO(m.join_date), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="text-xs italic line-clamp-2">
                            {m.application_answer || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {(m.nurture_step ?? 0)}/{MAX_NURTURE_STEP}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.last_business_touch
                            ? formatDistanceToNow(parseISO(m.last_business_touch), { addSuffix: true })
                            : 'never'}
                        </TableCell>
                        <TableCell>
                          {m.invited_to_sys ? (
                            <Badge variant="outline" className="text-xs">invited</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

      <MemberDetailDialog
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        member={selected}
        onUpdate={(updates) => {
          if (!selected) return;
          updateMember.mutate({ id: selected.id, updates });
        }}
        onMarkResponded={() => selected && markOutreachResponded.mutate(selected.id)}
      />

      <Footer />
    </div>
  );
}