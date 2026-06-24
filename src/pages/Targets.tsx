import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Loader2, Mail, Send, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import type { Member, IntentTier } from '@/types/member';
import { MemberDetailDialog } from '@/components/members/MemberDetailDialog';
import { useMembers } from '@/hooks/useMembers';
import { toast } from 'sonner';

type FreshnessFilter = 'all' | 'never_touched' | 'stale';
type TierFilter = 'all' | IntentTier;

interface FnStatus {
  configured: boolean;
  missing: string[];
}

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
  return data as { ok: boolean; configured?: boolean; missing?: string[]; eligibleCount?: number; reason?: string };
}

export default function Targets() {
  const { updateMember, markOutreachResponded } = useMembers();
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [freshness, setFreshness] = useState<FreshnessFilter>('all');
  const [selected, setSelected] = useState<Member | null>(null);
  const [mailerStatus, setMailerStatus] = useState<FnStatus | null>(null);
  const [sysStatus, setSysStatus] = useState<FnStatus | null>(null);

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ['targets'],
    queryFn: fetchTargets,
  });

  // Check stub configuration once on mount.
  useEffect(() => {
    callFn('sync-market-curious', { action: 'status' })
      .then((r) => setMailerStatus({ configured: !!r.configured, missing: r.missing || [] }))
      .catch(() => setMailerStatus({ configured: false, missing: ['MAILERLITE_API_KEY'] }));
    callFn('invite-to-sys', { action: 'status' })
      .then((r) => setSysStatus({ configured: !!r.configured, missing: r.missing || [] }))
      .catch(() => setSysStatus({ configured: false, missing: ['SYS_WEBHOOK_URL'] }));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return targets.filter((m) => {
      if (tierFilter !== 'all' && m.intent_tier !== tierFilter) return false;
      if (freshness === 'never_touched' && m.last_business_touch) return false;
      if (freshness === 'stale') {
        if (!m.last_business_touch) return false;
        const days = differenceInDays(now, parseISO(m.last_business_touch));
        if (days <= 30) return false;
      }
      return true;
    });
  }, [targets, tierFilter, freshness]);

  const previewDryRun = async (fn: string, label: string) => {
    try {
      const r = await callFn(fn, { action: 'dryRun' });
      toast.success(`${label}: ${r.eligibleCount ?? 0} eligible member(s)`);
    } catch (e) {
      toast.error(`${label} dry-run failed: ${e instanceof Error ? e.message : 'unknown error'}`);
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                MailerLite nurture sync
              </CardTitle>
              <CardDescription>
                Pushes curious + prospect into the <code>market-curious</code> group, tagged by tier.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => previewDryRun('sync-market-curious', 'Sync')}>
                Preview (dry-run)
              </Button>
              {mailerStatus?.configured ? (
                <Button onClick={async () => {
                  try {
                    const r = await callFn('sync-market-curious', { action: 'run' });
                    if (!r.ok) toast.error(`Sync: ${r.reason}`);
                    else toast.success('MailerLite sync started');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'sync failed');
                  }
                }}>
                  Sync to MailerLite
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button disabled>Sync to MailerLite</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Add {mailerStatus?.missing?.join(', ') || 'MAILERLITE_API_KEY'} to enable.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sell Your Sourdough migration
              </CardTitle>
              <CardDescription>
                Invites every curious + prospect member who hasn't been invited yet, via Skool webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => previewDryRun('invite-to-sys', 'Invite')}>
                Preview (dry-run)
              </Button>
              {sysStatus?.configured ? (
                <Button onClick={async () => {
                  try {
                    const r = await callFn('invite-to-sys', { action: 'run' });
                    if (!r.ok) toast.error(`Invite: ${r.reason}`);
                    else toast.success('SYS invites sent');
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'invite failed');
                  }
                }}>
                  Invite curious + prospect to SYS
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button disabled>Invite curious + prospect to SYS</Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Add {sysStatus?.missing?.join(', ') || 'SYS_WEBHOOK_URL'} to enable. Community must be open first.
                  </TooltipContent>
                </Tooltip>
              )}
            </CardContent>
          </Card>
        </div>

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
                      <TableHead>Joined</TableHead>
                      <TableHead>Learn goal (Q1)</TableHead>
                      <TableHead>Last touch</TableHead>
                      <TableHead className="text-right">Touches</TableHead>
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
                        <TableCell className="text-xs text-muted-foreground">
                          {m.last_business_touch
                            ? format(parseISO(m.last_business_touch), 'MMM d, yyyy')
                            : 'never'}
                        </TableCell>
                        <TableCell className="text-right text-xs">{m.business_touch_count ?? 0}</TableCell>
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