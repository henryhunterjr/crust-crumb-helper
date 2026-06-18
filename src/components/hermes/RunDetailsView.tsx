import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ExternalLink, Bot, FileText, Users, Activity, MessageSquare } from 'lucide-react';

type Details = Record<string, any>;

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function DraftBlock({ text, label }: { text: string; label: string }) {
  return (
    <div className="rounded border bg-card">
      <div className="px-3 py-2 border-b text-xs flex items-center justify-between bg-muted/30">
        <span className="font-medium">{label}</span>
        <button
          className="text-xs text-primary hover:underline"
          onClick={() => navigator.clipboard.writeText(text)}
        >
          Copy
        </button>
      </div>
      <ScrollArea className="max-h-64">
        <pre className="p-3 text-sm whitespace-pre-wrap font-sans">{text}</pre>
      </ScrollArea>
    </div>
  );
}

function MetricsGrid({ m }: { m: Details }) {
  const cells: [string, string | number][] = [
    ['Week', `${m.weekStart} → ${m.weekEnd}`],
    ['New members', m.newMembers],
    ['Total members', m.totalMembers],
    ['DMs sent', m.dmsSent],
    ['Replied', `${m.dmsReplied} (${m.replyRate}%)`],
    ['At-risk', m.atRiskCount],
    ['Inactive', m.inactiveCount],
    ['Top poster', m.topPoster ? `${m.topPoster.name} · ${m.topPoster.posts}` : '—'],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {cells.map(([k, v]) => (
        <div key={k} className="rounded border bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
          <div className="text-sm font-medium truncate">{v}</div>
        </div>
      ))}
    </div>
  );
}

export function RunDetailsView({ details }: { details: Details }) {
  if (!details || Object.keys(details).length === 0) {
    return <p className="text-sm text-muted-foreground">No details captured.</p>;
  }

  const targetLink = details.target?.page;

  return (
    <div className="space-y-4">
      {targetLink && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">target: {details.target.type}</Badge>
          <a href={targetLink} className="text-primary hover:underline inline-flex items-center gap-1">
            Open {targetLink} <ExternalLink className="h-3 w-3" />
          </a>
          {details.ai_used !== undefined && (
            <Badge variant={details.ai_used ? 'default' : 'secondary'} className="gap-1">
              <Bot className="h-3 w-3" />
              {details.ai_used ? 'AI-generated' : 'fallback template'}
            </Badge>
          )}
        </div>
      )}

      {/* Welcome post draft */}
      {details.draft_post && (
        <Section icon={FileText} title="Draft post (what would be published)">
          <DraftBlock text={details.draft_post} label={`Skool feed post · ${details.draft_post.length} chars`} />
        </Section>
      )}

      {/* Joiners list */}
      {Array.isArray(details.joiners) && details.joiners.length > 0 && (
        <Section icon={Users} title={`Joiners named (${details.joiners.length})`}>
          <div className="flex flex-wrap gap-1.5">
            {details.joiners.map((j: any, i: number) => (
              <Badge key={i} variant="secondary" className="font-normal">
                {typeof j === 'string' ? j : j.name}
                {typeof j === 'object' && j.has_goals && <span className="ml-1 opacity-60">★</span>}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Decision brief bullets */}
      {details.bullets && (
        <Section icon={Activity} title="Decision brief (5 bullets)">
          <DraftBlock text={details.bullets} label="Activity feed entry" />
        </Section>
      )}

      {/* Metrics */}
      {details.metrics && (
        <Section icon={Activity} title="Metrics used">
          <MetricsGrid m={details.metrics} />
          {Array.isArray(details.metrics.atRiskTop5) && details.metrics.atRiskTop5.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-muted-foreground mb-1">At-risk (oldest first)</div>
              <div className="flex flex-wrap gap-1.5">
                {details.metrics.atRiskTop5.map((m: any) => (
                  <a
                    key={m.id}
                    href="/members"
                    className="inline-flex items-center"
                  >
                    <Badge variant="outline" className="font-normal hover:bg-accent">
                      {m.name}{m.last_active ? ` · ${new Date(m.last_active).toLocaleDateString()}` : ''}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Re-engagement DM previews */}
      {Array.isArray(details.previews) && details.previews.length > 0 && (
        <Section icon={MessageSquare} title={`DM drafts (${details.previews.length})`}>
          <div className="space-y-2">
            {details.previews.map((p: any, i: number) => (
              <div key={i} className="rounded border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{p.member}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {p.type} · joined {p.joinedDaysAgo}d ago
                  </Badge>
                </div>
                {Array.isArray(p.matched) && p.matched.length > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Matched: {p.matched.map((x: any) => x.title || x).join(' · ')}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{p.preview}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Re-engagement caps */}
      {(details.dailyCap !== undefined || details.weeklyThreadCap !== undefined) && (
        <Section icon={Activity} title="Caps">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div className="rounded border bg-card px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Daily cap</div>
              <div>{details.dailyCap}</div>
            </div>
            <div className="rounded border bg-card px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Weekly thread cap</div>
              <div>{details.weeklyThreadCap}</div>
            </div>
            <div className="rounded border bg-card px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Used this week</div>
              <div>{details.usedThisWeek}</div>
            </div>
            <div className="rounded border bg-card px-3 py-2">
              <div className="text-[10px] uppercase text-muted-foreground">Target this run</div>
              <div>{details.targetCount}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Raw fallback for anything we didn't render */}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw details</summary>
        <ScrollArea className="max-h-48 mt-2">
          <pre className="bg-muted rounded p-3 whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
        </ScrollArea>
      </details>
    </div>
  );
}