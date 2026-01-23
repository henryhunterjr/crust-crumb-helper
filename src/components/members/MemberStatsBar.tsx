import { Users, UserX, AlertTriangle, Clock, Send, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface MemberStatsBarProps {
  stats: {
    total: number;
    neverEngaged: number;
    atRisk: number;
    inactive: number;
    outreachSentThisWeek: number;
    responseRate: number;
  };
}

export function MemberStatsBar({ stats }: MemberStatsBarProps) {
  const statItems = [
    { label: 'Total Members', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Never Engaged', value: stats.neverEngaged, icon: UserX, color: 'text-destructive' },
    { label: 'At Risk', value: stats.atRisk, icon: AlertTriangle, color: 'text-[hsl(30,100%,50%)]' },
    { label: 'Inactive 30+', value: stats.inactive, icon: Clock, color: 'text-[hsl(45,100%,50%)]' },
    { label: 'Outreach This Week', value: stats.outreachSentThisWeek, icon: Send, color: 'text-primary' },
    { label: 'Response Rate', value: `${stats.responseRate}%`, icon: CheckCircle, color: 'text-[hsl(142,76%,36%)]' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {statItems.map((stat) => (
        <Card key={stat.label} className="p-3">
          <div className="flex items-center gap-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stat.value}</p>
        </Card>
      ))}
    </div>
  );
}
