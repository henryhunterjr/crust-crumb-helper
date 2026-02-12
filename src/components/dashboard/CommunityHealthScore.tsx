import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CommunityHealthScoreProps {
  totalMembers: number;
  welcomedCount: number;
  activeCount: number;
  neverEngaged: number;
  atRisk: number;
  responseRate: number;
}

export function CommunityHealthScore({
  totalMembers,
  welcomedCount,
  activeCount,
  neverEngaged,
  atRisk,
  responseRate,
}: CommunityHealthScoreProps) {
  const score = useMemo(() => {
    if (totalMembers === 0) return 0;

    // % of members welcomed
    const welcomePct = totalMembers > 0 ? (welcomedCount / totalMembers) * 100 : 0;
    // % of members active in last 30 days
    const activePct = totalMembers > 0 ? (activeCount / totalMembers) * 100 : 0;
    // Inverse churn (lower never_engaged = better)
    const engagementPct = totalMembers > 0 ? ((totalMembers - neverEngaged) / totalMembers) * 100 : 0;
    // Response rate
    const respPct = responseRate;

    // Weighted average
    const healthScore = Math.round(
      (welcomePct * 0.3) +
      (activePct * 0.25) +
      (engagementPct * 0.3) +
      (respPct * 0.15)
    );

    return Math.min(100, Math.max(0, healthScore));
  }, [totalMembers, welcomedCount, activeCount, neverEngaged, responseRate]);

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-600';
    if (s >= 40) return 'text-yellow-600';
    return 'text-destructive';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return 'Healthy';
    if (s >= 40) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Community Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </div>
            <div className={`text-xs font-medium ${getScoreColor(score)}`}>
              {getScoreLabel(score)}
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Welcomed</span>
                <span>{welcomedCount}/{totalMembers}</span>
              </div>
              <Progress value={totalMembers > 0 ? (welcomedCount / totalMembers) * 100 : 0} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Active</span>
                <span>{activeCount}/{totalMembers}</span>
              </div>
              <Progress value={totalMembers > 0 ? (activeCount / totalMembers) * 100 : 0} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Response Rate</span>
                <span>{responseRate}%</span>
              </div>
              <Progress value={responseRate} className="h-1.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
