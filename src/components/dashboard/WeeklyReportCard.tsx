import { useState } from 'react';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { FileText, Loader2, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useWeeklyReports, WeeklyReport } from '@/hooks/useWeeklyReports';
import { toast } from 'sonner';

export function WeeklyReportCard() {
  const { reports, generateReport } = useWeeklyReports();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const now = new Date();
  const thisWeekStart = format(startOfWeek(now), 'yyyy-MM-dd');
  const thisWeekEnd = format(endOfWeek(now), 'yyyy-MM-dd');
  const lastWeekStart = format(startOfWeek(subWeeks(now, 1)), 'yyyy-MM-dd');
  const lastWeekEnd = format(endOfWeek(subWeeks(now, 1)), 'yyyy-MM-dd');

  const latestReport = reports[0];
  const hasThisWeek = latestReport?.week_start === thisWeekStart;

  const handleGenerate = () => {
    generateReport.mutate({ weekStart: thisWeekStart, weekEnd: thisWeekEnd });
  };

  const handleGenerateLast = () => {
    generateReport.mutate({ weekStart: lastWeekStart, weekEnd: lastWeekEnd });
  };

  const handleCopy = async () => {
    if (!latestReport) return;
    const d = latestReport.report_data;
    const text = [
      `WEEKLY REPORT — ${format(new Date(latestReport.week_start), 'MMM d')} – ${format(new Date(latestReport.week_end), 'MMM d, yyyy')}`,
      '',
      'OUTREACH',
      `  DMs sent: ${d.dms_sent || 0}`,
      `  Response rate: ${d.response_rate || 0}%`,
      '',
      'MEMBERS',
      `  Total: ${d.total_members || 0}`,
      `  Active: ${d.active_count || 0}`,
      `  New this week: ${d.new_members || 0}`,
      '',
      'HEALTH SCORE',
      `  ${latestReport.health_score || 0}/100`,
      '',
      ...(d.recommendations || []).map((r: string, i: number) => `${i + 1}. ${r}`),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Report copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">Weekly Report</CardTitle>
          </div>
          <div className="flex gap-2">
            {latestReport && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copy
              </Button>
            )}
            <Button size="sm" className="h-7 text-xs" onClick={handleGenerate} disabled={generateReport.isPending}>
              {generateReport.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
              {hasThisWeek ? 'Refresh' : 'Generate'}
            </Button>
          </div>
        </div>
        {!latestReport && (
          <CardDescription>Generate a report to see this week's summary</CardDescription>
        )}
      </CardHeader>

      {latestReport && (
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{latestReport.report_data.dms_sent || 0}</p>
              <p className="text-[10px] text-muted-foreground">DMs Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{latestReport.report_data.response_rate || 0}%</p>
              <p className="text-[10px] text-muted-foreground">Response</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{latestReport.report_data.new_members || 0}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{latestReport.health_score || 0}</p>
              <p className="text-[10px] text-muted-foreground">Health</p>
            </div>
          </div>

          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'Collapse' : 'View Details'}
          </Button>

          {expanded && (
            <div className="mt-3 space-y-3 text-sm">
              <Separator />
              {latestReport.report_data.recommendations?.length > 0 && (
                <div>
                  <p className="font-medium text-xs mb-2">AI Recommendations</p>
                  <div className="space-y-2">
                    {latestReport.report_data.recommendations.map((r: string, i: number) => (
                      <p key={i} className="text-xs text-muted-foreground bg-accent/50 rounded p-2">
                        {i + 1}. {r}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Report History */}
              {reports.length > 1 && (
                <div>
                  <p className="font-medium text-xs mb-2">History</p>
                  <div className="space-y-1">
                    {reports.slice(1, 5).map(r => (
                      <div key={r.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(new Date(r.week_start), 'MMM d')} – {format(new Date(r.week_end), 'MMM d')}</span>
                        <div className="flex items-center gap-3">
                          <span>Health: {r.health_score || '—'}</span>
                          <span>DMs: {r.report_data.dms_sent || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
