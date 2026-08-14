import { AlertTriangle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataTrust } from '@/hooks/useDataTrust';

export function DataTrustPanel() {
  const trust = useDataTrust();

  if (trust.isLoading) {
    return (
      <Card className="mb-6"><CardContent className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" /> Checking source freshness…
      </CardContent></Card>
    );
  }

  const state = trust.error || !trust.latest ? 'unverified' : trust.isFresh ? 'current' : 'stale';
  const label = state === 'current' ? 'Source data current' : state === 'stale' ? 'Source data stale' : 'Source data unverified';

  return (
    <Card className="mb-6 border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2"><Database className="h-4 w-4" /> Data confidence</CardTitle>
          <Badge variant={state === 'current' ? 'default' : 'destructive'}>
            {state === 'current' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
            {label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {trust.latest ? (
          <p>
            Last roster evidence: <strong>{trust.latest.total_seen ?? 'unknown'} members</strong>,{' '}
            {formatDistanceToNow(new Date(trust.latest.captured_at || trust.latest.created_at), { addSuffix: true })}.
            {!trust.latest.full_roster && ' This was not marked as a full roster read.'}
          </p>
        ) : (
          <p>No roster sync evidence is available. Dashboard counts should be treated as imported estimates.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {trust.latestByCommunity.map((run) => (
            <Badge key={run.id} variant="outline">
              {run.community || 'Unknown community'}: {run.status || 'unknown'} · {run.total_seen ?? '?'} seen
            </Badge>
          ))}
          <Badge variant="outline">
            Skoo.ly events (24h): {trust.webhookConfigured ? trust.webhookEvents24h ?? 0 : 'not deployed'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Sent and response metrics are local workflow records until a verified delivery or reply event is recorded.
        </p>
      </CardContent>
    </Card>
  );
}
