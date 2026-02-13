import { useState } from 'react';
import { TrendingUp, Send, Mail, MessageSquare, BarChart3, Camera, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOutreachAnalytics, useSegmentSnapshots } from '@/hooks/useAnalytics';
import { useMembers } from '@/hooks/useMembers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { cn } from '@/lib/utils';

const templateLabels: Record<string, string> = {
  welcome_message: 'Welcome',
  resource_recommendation: 'Resources',
  feedback_request: 'Feedback',
  custom: 'Custom',
  bake_along_invite: 'Bake-Along Invite',
  congratulations: 'Congratulations',
  gentle_nudge: 'Gentle Nudge',
  re_engagement: 'Re-engagement',
};

export default function Analytics() {
  const [timeRange, setTimeRange] = useState(30);
  const { stats, chartData, templatePerformance } = useOutreachAnalytics(timeRange);
  const { trends, takeSnapshot } = useSegmentSnapshots();
  const { stats: memberStats } = useMembers();

  const dmChange = stats.prevDmsSent > 0
    ? Math.round(((stats.dmsSent - stats.prevDmsSent) / stats.prevDmsSent) * 100)
    : stats.dmsSent > 0 ? 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track outreach effectiveness and community health</p>
          </div>
          <div className="flex gap-2">
            <Select value={String(timeRange)} onValueChange={v => setTimeRange(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => takeSnapshot.mutate()} disabled={takeSnapshot.isPending}>
              <Camera className="h-4 w-4 mr-1" />
              Snapshot
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Send className="h-4 w-4" />
                DMs Sent
              </div>
              <p className="text-3xl font-bold mt-1">{stats.dmsSent}</p>
              <div className={cn('text-xs flex items-center gap-1 mt-1', dmChange >= 0 ? 'text-green-600' : 'text-destructive')}>
                {dmChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(dmChange)}% vs prev period
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Mail className="h-4 w-4" />
                Emails Sent
              </div>
              <p className="text-3xl font-bold mt-1">0</p>
              <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MessageSquare className="h-4 w-4" />
                Response Rate
              </div>
              <p className="text-3xl font-bold mt-1">{stats.responseRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.responded} responded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Active Rate
              </div>
              <p className="text-3xl font-bold mt-1">
                {memberStats.total > 0 ? Math.round((memberStats.active / memberStats.total) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">{memberStats.active} of {memberStats.total} members</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Messages Sent Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="dms" stroke="hsl(var(--primary))" name="DMs" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--muted-foreground))" name="Total" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No data yet. Send DMs to see trends here.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Template Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Performance</CardTitle>
              <CardDescription>Which message types get the best responses</CardDescription>
            </CardHeader>
            <CardContent>
              {templatePerformance.length > 0 ? (
                <div className="space-y-3">
                  {templatePerformance.map(t => (
                    <div key={t.template} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{templateLabels[t.template] || t.template}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.sent} sent · {t.responded} responded
                          {t.avgDays !== null && ` · avg ${t.avgDays}d`}
                        </p>
                      </div>
                      <Badge variant={t.rate >= 30 ? 'default' : 'secondary'} className="text-xs">
                        {t.rate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Mark DMs as "responded" in the Outreach Log to see performance data
                </p>
              )}
            </CardContent>
          </Card>

          {/* Segment Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Segment Trends</CardTitle>
              <CardDescription>
                {trends.length > 0
                  ? `${trends.length} snapshots recorded`
                  : 'Click "Snapshot" to start tracking trends'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <div className="space-y-2">
                  {['Active', 'At Risk', 'Never Engaged', 'Needs Welcome', 'Inactive'].map(seg => {
                    const latest = trends[trends.length - 1]?.[seg] || 0;
                    const prev = trends.length > 1 ? (trends[trends.length - 2]?.[seg] || 0) : null;
                    const change = prev !== null ? latest - prev : null;

                    return (
                      <div key={seg} className="flex items-center justify-between">
                        <span className="text-sm">{seg}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{latest}</span>
                          {change !== null && change !== 0 && (
                            <span className={cn(
                              'text-xs',
                              (seg === 'Active' ? change > 0 : change < 0) ? 'text-green-600' : 'text-destructive'
                            )}>
                              {change > 0 ? '+' : ''}{change}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p>Take your first snapshot to start tracking</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => takeSnapshot.mutate()}>
                    <Camera className="h-4 w-4 mr-1" />
                    Take Snapshot Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
