import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, Tag, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UrgentAction {
  level: 'urgent' | 'this_week' | 'opportunity';
  icon: React.ReactNode;
  label: string;
  count: number;
  route: string;
  actionLabel: string;
}

interface UrgentActionsPanelProps {
  membersNeedingWelcome: number;
  membersAtRisk: number;
  membersNoGoals: number;
  activeMembers: number;
}

export function UrgentActionsPanel({
  membersNeedingWelcome,
  membersAtRisk,
  membersNoGoals,
  activeMembers,
}: UrgentActionsPanelProps) {
  const navigate = useNavigate();

  const actions = useMemo<UrgentAction[]>(() => {
    const items: UrgentAction[] = [];

    if (membersNeedingWelcome > 0) {
      items.push({
        level: 'urgent',
        icon: <AlertTriangle className="h-4 w-4" />,
        label: `${membersNeedingWelcome} member${membersNeedingWelcome !== 1 ? 's' : ''} need welcome (3+ days since joining)`,
        count: membersNeedingWelcome,
        route: '/members?filter=needs_welcome',
        actionLabel: 'Generate Batch Messages',
      });
    }

    if (membersAtRisk > 0) {
      items.push({
        level: 'urgent',
        icon: <Eye className="h-4 w-4" />,
        label: `${membersAtRisk} member${membersAtRisk !== 1 ? 's' : ''} at risk of churning (were active, now dormant 14+ days)`,
        count: membersAtRisk,
        route: '/members?filter=at_risk',
        actionLabel: 'View Profiles',
      });
    }

    if (membersNoGoals > 0) {
      items.push({
        level: 'this_week',
        icon: <Tag className="h-4 w-4" />,
        label: `${membersNoGoals} members tagged "No Goals"`,
        count: membersNoGoals,
        route: '/members?filter=no_goals',
        actionLabel: 'Reach Out to Clarify',
      });
    }

    if (activeMembers > 0) {
      items.push({
        level: 'opportunity',
        icon: <MessageCircle className="h-4 w-4" />,
        label: `${activeMembers} active members this week`,
        count: activeMembers,
        route: '/members?filter=all',
        actionLabel: 'Engage',
      });
    }

    return items;
  }, [membersNeedingWelcome, membersAtRisk, membersNoGoals, activeMembers]);

  const urgentActions = actions.filter(a => a.level === 'urgent');
  const weekActions = actions.filter(a => a.level === 'this_week');
  const opportunities = actions.filter(a => a.level === 'opportunity');

  if (actions.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">What Needs Your Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {urgentActions.length > 0 && (
          <div className="space-y-2">
            <Badge variant="destructive" className="text-xs">🔴 URGENT</Badge>
            {urgentActions.map((action, i) => (
              <div key={i} className="flex items-center justify-between gap-4 pl-4 py-1">
                <div className="flex items-center gap-2 text-sm">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(action.route)}>
                  {action.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        )}

        {weekActions.length > 0 && (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs">🟡 THIS WEEK</Badge>
            {weekActions.map((action, i) => (
              <div key={i} className="flex items-center justify-between gap-4 pl-4 py-1">
                <div className="flex items-center gap-2 text-sm">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(action.route)}>
                  {action.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        )}

        {opportunities.length > 0 && (
          <div className="space-y-2">
            <Badge variant="outline" className="text-xs">🟢 OPPORTUNITIES</Badge>
            {opportunities.map((action, i) => (
              <div key={i} className="flex items-center justify-between gap-4 pl-4 py-1">
                <div className="flex items-center gap-2 text-sm">
                  {action.icon}
                  <span>{action.label}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(action.route)}>
                  {action.actionLabel}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
