import { useMemo, useState } from 'react';
import { Brain, BookOpen, HandHeart, Target, Users, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Member } from '@/types/member';
import type { MemberCompassProfile } from '@/types/memberCompass';
import { tallyCompassValues } from '@/lib/memberCompass';
import { backfillApplicationAnswers } from '@/hooks/useMemberCompass';
import { toast } from 'sonner';

interface Props {
  members: Member[];
  profiles: MemberCompassProfile[];
  onFindMembers: (query: string) => void;
  onOpenMember: (member: Member) => void;
}

export function MemberCompassDashboard({ members, profiles, onFindMembers, onOpenMember }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const struggles = useMemo(() => tallyCompassValues(profiles, 'struggles').slice(0, 5), [profiles]);
  const goals = useMemo(() => tallyCompassValues(profiles, 'learning_goals').slice(0, 5), [profiles]);
  const interests = useMemo(() => tallyCompassValues(profiles, 'bread_interests').slice(0, 5), [profiles]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, developing: 0, confident: 0, advanced: 0, unknown: 0 };
    profiles.forEach((profile) => { counts[profile.baking_stage] = (counts[profile.baking_stage] || 0) + 1; });
    return counts;
  }, [profiles]);

  const needsHenry = useMemo(() => {
    return profiles
      .map((profile) => ({ profile, member: memberById.get(profile.member_id) }))
      .filter(({ profile, member }) => member && profile.next_best_action && (
        ['never_engaged', 'at_risk', 'inactive'].includes(member.engagement_status) || !member.outreach_sent
      ))
      .sort((a, b) => {
        const rank = (status?: string) => status === 'at_risk' ? 0 : status === 'never_engaged' ? 1 : status === 'inactive' ? 2 : 3;
        return rank(a.member?.engagement_status) - rank(b.member?.engagement_status);
      })
      .slice(0, 5);
  }, [profiles, memberById]);

  const noResource = profiles.filter((profile) =>
    (profile.struggles.length || profile.learning_goals.length) && !profile.recommended_resource_url
  ).length;

  const handleAnalyzePending = async () => {
    setIsAnalyzing(true);
    try {
      const result = await backfillApplicationAnswers(5);
      if (result.processed > 0) toast.success(`Analyzed ${result.processed} member profiles. Refreshing Compass data…`);
      else toast.info('No unanalyzed application answers were found in this batch.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not analyze pending profiles');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderTopics = (items: Array<{ topic: string; count: number }>, empty: string) => (
    items.length ? (
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.topic}
            onClick={() => onFindMembers(item.topic)}
            className="w-full flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm capitalize">{item.topic}</span>
            <Badge variant="secondary">{item.count}</Badge>
          </button>
        ))}
      </div>
    ) : <p className="text-sm text-muted-foreground">{empty}</p>
  );

  return (
    <section className="space-y-4 mb-6">
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              What can we help them do next?
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profiles.length} of {members.length} members currently have a Compass profile. Member needs, not vanity stats, drive this view.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{noResource} needs without a resource match</Badge>
            <Button variant="outline" size="sm" onClick={handleAnalyzePending} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Analyze next 5
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HandHeart className="h-4 w-4" />Top struggles</CardTitle></CardHeader>
          <CardContent>{renderTopics(struggles, 'Import introductions or analyze application answers to see member struggles.')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />What should we teach next?</CardTitle></CardHeader>
          <CardContent>{renderTopics(goals, 'Learning goals will appear here as members are analyzed.')}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Bread interests</CardTitle></CardHeader>
          <CardContent>{renderTopics(interests, 'Bread interests will appear here as members are analyzed.')}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />Baking stage</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <button key={stage} onClick={() => onFindMembers(stage)} disabled={!count}>
                <Badge variant={stage === 'unknown' ? 'outline' : 'secondary'} className="capitalize cursor-pointer">{stage}: {count}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Who needs Henry this week?</CardTitle></CardHeader>
          <CardContent>
            {needsHenry.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Compass follow-ups are ready yet.</p>
            ) : (
              <div className="space-y-2">
                {needsHenry.map(({ member, profile }) => member && (
                  <button
                    key={member.id}
                    onClick={() => onOpenMember(member)}
                    className="w-full rounded-md border px-3 py-2 text-left hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{member.skool_name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{profile.next_best_action}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
