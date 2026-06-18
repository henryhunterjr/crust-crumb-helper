import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Play, Eye, Power, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHermesJobs, useHermesJobRuns, useToggleHermesJob, useRunHermesJob } from '@/hooks/useHermesJobs';
import { HermesJob, HermesJobRun } from '@/types/hermes';
import { RunDetailsView } from '@/components/hermes/RunDetailsView';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">never run</Badge>;
  const map: Record<string, { variant: any; icon: any; label: string }> = {
    success: { variant: 'default', icon: CheckCircle2, label: 'success' },
    partial: { variant: 'secondary', icon: AlertCircle, label: 'partial' },
    failed: { variant: 'destructive', icon: XCircle, label: 'failed' },
    running: { variant: 'secondary', icon: Loader2, label: 'running' },
  };
  const m = map[status] || { variant: 'outline', icon: Clock, label: status };
  const Icon = m.icon;
  return (
    <Badge variant={m.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {m.label}
    </Badge>
  );
}

function JobCard({ job, onPreview }: { job: HermesJob; onPreview: (job: HermesJob) => void }) {
  const toggle = useToggleHermesJob();
  const run = useRunHermesJob();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{job.display_name}</CardTitle>
            <CardDescription className="mt-1">{job.description}</CardDescription>
          </div>
          <Switch
            checked={job.enabled}
            disabled={toggle.isPending}
            onCheckedChange={(enabled) => toggle.mutate({ id: job.id, enabled })}
            aria-label="Enable job"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Schedule</p>
            <p className="font-medium">{job.schedule_label}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Next run</p>
            <p className="font-medium">
              {job.next_run_at ? formatDistanceToNow(new Date(job.next_run_at), { addSuffix: true }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last run</p>
            <p className="font-medium">
              {job.last_run_at ? formatDistanceToNow(new Date(job.last_run_at), { addSuffix: true }) : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last status</p>
            <StatusBadge status={job.last_run_status} />
          </div>
        </div>
        {job.last_run_summary && (
          <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
            {job.last_run_summary}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => run.mutate({ jobId: job.id, dryRun: false })}
            disabled={run.isPending}
          >
            <Play className="h-3 w-3 mr-1" /> Run Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(job)}
          >
            <Eye className="h-3 w-3 mr-1" /> Preview
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toggle.mutate({ id: job.id, enabled: !job.enabled })}
            disabled={toggle.isPending}
          >
            <Power className="h-3 w-3 mr-1" /> {job.enabled ? 'Pause' : 'Resume'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewDialog({ job, open, onOpenChange }: { job: HermesJob | null; open: boolean; onOpenChange: (b: boolean) => void }) {
  const run = useRunHermesJob();
  const [result, setResult] = useState<any>(null);

  const runPreview = async () => {
    if (!job) return;
    setResult(null);
    try {
      const data = await run.mutateAsync({ jobId: job.id, dryRun: true });
      setResult(data);
    } catch (err: any) {
      setResult({ error: err?.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { onOpenChange(b); if (!b) setResult(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preview: {job?.display_name}</DialogTitle>
          <DialogDescription>
            Runs the job in dry mode. Nothing is saved or sent. Use this to see what would happen if the job fired now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Button onClick={runPreview} disabled={run.isPending}>
            {run.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Run preview
          </Button>
          {result && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                {result.error ? (
                  <p className="text-destructive text-sm">{result.error}</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={result.status} />
                      <span className="text-sm">
                        {result.items_processed} processed · {result.items_succeeded} ok · {result.items_failed} failed
                      </span>
                    </div>
                    <p className="text-sm">{result.summary}</p>
                    {result.details && (
                      <div className="mt-2">
                        <RunDetailsView details={result.details} />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RunLog() {
  const { data: runs = [], isLoading } = useHermesJobRuns();
  const [detail, setDetail] = useState<HermesJobRun | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 50 runs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No runs yet. Click Run Now on a job above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail(r)}>
                    <TableCell className="font-medium text-xs">{r.job_type}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.trigger}{r.dry_run ? ' (dry)' : ''}</Badge></TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-xs">{r.items_succeeded}/{r.items_processed}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">{r.summary || r.error_message || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!detail} onOpenChange={(b) => !b && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.job_type}</DialogTitle>
            <DialogDescription>
              {detail && new Date(detail.started_at).toLocaleString()} · {detail?.duration_ms ? `${detail.duration_ms}ms` : 'running'}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={detail.status} />
                <span className="text-sm">{detail.items_succeeded} ok / {detail.items_failed} failed / {detail.items_processed} processed</span>
              </div>
              {detail.summary && <p className="text-sm">{detail.summary}</p>}
              {detail.error_message && (
                <p className="text-sm text-destructive border border-destructive/30 rounded p-2">{detail.error_message}</p>
              )}
              {detail.details && <RunDetailsView details={detail.details} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Hermes() {
  const { data: jobs = [], isLoading } = useHermesJobs();
  const [previewJob, setPreviewJob] = useState<HermesJob | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="container px-4 py-6 flex-1">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold">Hermes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Autonomous job dashboard. Schedule, preview, and review every recurring task. All output lands as a draft for your review — nothing auto-sends to Skool in Phase 1.
          </p>
        </div>

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="log">Run Log</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} onPreview={(j) => setPreviewJob(j)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <RunLog />
          </TabsContent>
        </Tabs>

        <PreviewDialog
          job={previewJob}
          open={!!previewJob}
          onOpenChange={(b) => !b && setPreviewJob(null)}
        />
      </main>
      <Footer />
    </div>
  );
}