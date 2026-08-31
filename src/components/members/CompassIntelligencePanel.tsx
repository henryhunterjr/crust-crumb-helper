import { useMemo, useState } from 'react';
import { Compass, GraduationCap, LifeBuoy, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Member } from '@/types/member';
import { MemberCompassProfile, MemberSource, STAGE_LABELS, BakingStage } from '@/types/compass';

interface Props {
  members: Member[];
  profilesByMember: Map<string, MemberCompassProfile>;
  sourcesByMember: Map<string, MemberSource[]>;
  communityLabel: string;
  /** Drill down: restrict the member list to these ids. */
  onDrillDown: (label: string, memberIds: string[]) => void;
  onOpenMember: (member: Member) => void;
}

interface Bucket {
  term: string;
  memberIds: string[];
}

function tally(
  members: Member[],
  profiles: Map<string, MemberCompassProfile>,
  pick: (p: MemberCompassProfile) => string[]
): Bucket[] {
  const map = new Map<string, Set<string>>();
  for (const m of members) {
    const p = profiles.get(m.id);
    if (!p) continue;
    for (const raw of pick(p)) {
      const term = raw.trim().toLowerCase();
      if (!term) continue;
      const set = map.get(term) || new Set<string>();
      set.add(m.id);
      map.set(term, set);
    }
  }
  return [...map.entries()]
    .map(([term, ids]) => ({ term, memberIds: [...ids] }))
    .sort((a, b) => b.memberIds.length - a.memberIds.length);
}

function TopList({
  title,
  buckets,
  onDrillDown,
  emptyText,
}: {
  title: string;
  buckets: Bucket[];
  onDrillDown: (label: string, ids: string[]) => void;
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {buckets.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {buckets.slice(0, 8).map((b) => (
            <button
              key={b.term}
              onClick={() => onDrillDown(`${title}: ${b.term}`, b.memberIds)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs transition-colors hover:bg-accent hover:text-foreground"
            >
              {b.term}
              <span className="ml-1.5 font-semibold">{b.memberIds.length}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompassIntelligencePanel({
  members,
  profilesByMember,
  sourcesByMember,
  communityLabel,
  onDrillDown,
  onOpenMember,
}: Props) {
  const [open, setOpen] = useState(true);

  const struggles = useMemo(
    () => tally(members, profilesByMember, (p) => p.struggles),
    [members, profilesByMember]
  );
  const goals = useMemo(
    () => tally(members, profilesByMember, (p) => p.learning_goals),
    [members, profilesByMember]
  );
  const interests = useMemo(
    () => tally(members, profilesByMember, (p) => p.bread_interests),
    [members, profilesByMember]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, string[]> = {};
    for (const m of members) {
      const p = profilesByMember.get(m.id);
      const stage: BakingStage = p?.baking_stage || 'unknown';
      counts[stage] = [...(counts[stage] || []), m.id];
    }
    return counts;
  }, [members, profilesByMember]);

  // Rich intro, nothing sent back yet.
  const richNoFollowUp = useMemo(
    () =>
      members.filter((m) => {
        const p = profilesByMember.get(m.id);
        if (!p) return false;
        const rich =
          p.insight_confidence !== 'low' ||
          p.learning_goals.length + p.struggles.length >= 2;
        return rich && !m.outreach_sent;
      }),
    [members, profilesByMember]
  );

  // Clear goal but the library has nothing to point at.
  const goalNoResource = useMemo(
    () =>
      members.filter((m) => {
        const p = profilesByMember.get(m.id);
        return !!p && p.learning_goals.length > 0 && !p.recommended_resource_title;
      }),
    [members, profilesByMember]
  );

  // Who needs Henry: has a next best action and no outreach yet, most specific first.
  const needsHenry = useMemo(
    () =>
      members
        .map((m) => ({ m, p: profilesByMember.get(m.id) }))
        .filter(({ m, p }) => !!p?.next_best_action && !m.outreach_sent)
        .sort((a, b) => {
          const rank = { high: 0, medium: 1, low: 2 } as Record<string, number>;
          return (
            (rank[a.p!.insight_confidence] ?? 3) - (rank[b.p!.insight_confidence] ?? 3)
          );
        })
        .slice(0, 10),
    [members, profilesByMember]
  );

  // Teaching opportunities: demand from goals + interests, plus whether the
  // library already covers it.
  const teaching = useMemo(() => {
    const merged = new Map<string, { ids: Set<string>; covered: boolean; title?: string }>();
    for (const list of [goals, interests]) {
      for (const b of list) {
        const cur = merged.get(b.term) || { ids: new Set<string>(), covered: false };
        b.memberIds.forEach((id) => cur.ids.add(id));
        merged.set(b.term, cur);
      }
    }
    for (const [term, entry] of merged) {
      for (const id of entry.ids) {
        const p = profilesByMember.get(id);
        if (p?.recommended_resource_title) {
          entry.covered = true;
          entry.title = p.recommended_resource_title;
          break;
        }
      }
      merged.set(term, entry);
    }
    return [...merged.entries()]
      .map(([term, e]) => ({ term, memberIds: [...e.ids], covered: e.covered, title: e.title }))
      .filter((t) => t.memberIds.length >= 2)
      .sort((a, b) => b.memberIds.length - a.memberIds.length)
      .slice(0, 6);
  }, [goals, interests, profilesByMember]);

  const analyzedCount = members.filter((m) => profilesByMember.has(m.id)).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-6 rounded-lg border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <span className="font-semibold">Compass — {communityLabel}</span>
          <Badge variant="outline" className="text-xs">
            {analyzedCount} analyzed
          </Badge>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-5 border-t p-4">
        {analyzedCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Compass insights yet for this community. Import introductions or run the backfill
            to get started.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <TopList
                title="Top struggles"
                buckets={struggles}
                onDrillDown={onDrillDown}
                emptyText="Nothing captured yet."
              />
              <TopList
                title="Top learning goals"
                buckets={goals}
                onDrillDown={onDrillDown}
                emptyText="Nothing captured yet."
              />
              <TopList
                title="Bread interests"
                buckets={interests}
                onDrillDown={onDrillDown}
                emptyText="Nothing captured yet."
              />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Baking stage
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(STAGE_LABELS) as BakingStage[]).map((s) => {
                    const ids = stageCounts[s] || [];
                    if (ids.length === 0) return null;
                    return (
                      <button
                        key={s}
                        onClick={() => onDrillDown(`Stage: ${STAGE_LABELS[s]}`, ids)}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs hover:bg-accent hover:text-foreground"
                      >
                        {STAGE_LABELS[s]}
                        <span className="ml-1.5 font-semibold">{ids.length}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() =>
                  onDrillDown(
                    'Rich intro, no follow-up',
                    richNoFollowUp.map((m) => m.id)
                  )
                }
                className="rounded-md border p-3 text-left transition-colors hover:bg-accent/40"
              >
                <p className="text-2xl font-bold">{richNoFollowUp.length}</p>
                <p className="text-xs text-muted-foreground">
                  Rich introductions with no follow-up
                </p>
              </button>
              <button
                onClick={() =>
                  onDrillDown('Goals with no resource match', goalNoResource.map((m) => m.id))
                }
                className="rounded-md border p-3 text-left transition-colors hover:bg-accent/40"
              >
                <p className="text-2xl font-bold">{goalNoResource.length}</p>
                <p className="text-xs text-muted-foreground">Goals with no resource match</p>
              </button>
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                What should we teach next?
              </h3>
              {teaching.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Not enough shared demand yet. Two or more members need to want the same thing.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {teaching.map((t) => (
                    <div
                      key={t.term}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t.term}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.memberIds.length} members asked for this.{' '}
                          {t.covered
                            ? `Library already has: ${t.title}`
                            : 'Nothing in the library covers it yet.'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDrillDown(`Teaching: ${t.term}`, t.memberIds)}
                      >
                        See members
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <LifeBuoy className="h-3.5 w-3.5" />
                Who needs Henry this week?
              </h3>
              {needsHenry.length === 0 ? (
                <p className="mt-1.5 text-xs text-muted-foreground">Queue is clear.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {needsHenry.map(({ m, p }) => (
                    <button
                      key={m.id}
                      onClick={() => onOpenMember(m)}
                      className="block w-full rounded-md border p-2.5 text-left transition-colors hover:bg-accent/40"
                    >
                      <p className="text-sm font-medium">{m.skool_name}</p>
                      <p className="text-xs text-muted-foreground">{p!.next_best_action}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
