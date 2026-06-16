import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Activity, History, BeakerIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FN = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;
const KEY_STORAGE = "lovable.ingestApiKey";
const TABLES = ["youtube_videos", "recipes", "blog_posts", "classroom_resources"] as const;

type SyncRun = {
  id: string;
  source: string;
  status: string;
  dry_run: boolean;
  topics_seen: number;
  entries_seen: number;
  inserted: Record<string, number>;
  skipped: Record<string, number>;
  deltas: Record<string, { before: number; after: number; delta: number }>;
  topic_errors: string[];
  error_message: string | null;
  duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
};

type Health = {
  ok: boolean;
  checkedAt: string;
  tables: Record<string, { total: number; bread_authority: number; manual: number; missing_source: number }>;
  lastSync: SyncRun | null;
  lastSyncAt: string | null;
  staleSync: boolean;
  issues: string[];
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString(); } catch { return s; }
}
function fmtDelta(n: number) {
  if (n > 0) return `+${n}`;
  return String(n);
}

export default function Admin() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(KEY_STORAGE) || "");
  const [savedKey, setSavedKey] = useState<string>(() => localStorage.getItem(KEY_STORAGE) || "");
  const [syncing, setSyncing] = useState(false);
  const [syncDryRun, setSyncDryRun] = useState(false);
  const [lastSyncResponse, setLastSyncResponse] = useState<any>(null);

  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const [health, setHealth] = useState<Health | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [welcomeBusy, setWelcomeBusy] = useState(false);
  const [welcomeResponse, setWelcomeResponse] = useState<any>(null);
  const [welcomeNewDays, setWelcomeNewDays] = useState(7);
  const [welcomeBacklog, setWelcomeBacklog] = useState(5);

  const saveKey = () => {
    localStorage.setItem(KEY_STORAGE, apiKey);
    setSavedKey(apiKey);
    toast.success("API key saved locally");
  };

  const callFn = async (name: string, init: RequestInit = {}) => {
    if (!savedKey) throw new Error("Set the Ingest API key first");
    const res = await fetch(FN(name), {
      method: "POST",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${savedKey}`,
        ...(init.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
    return data;
  };

  const loadRuns = async () => {
    setRunsLoading(true);
    try {
      const { data, error } = await supabase
        .from("sync_runs" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      setRuns((data || []) as unknown as SyncRun[]);
    } catch (e: any) {
      toast.error(`Could not load run history: ${e.message}`);
    } finally {
      setRunsLoading(false);
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await callFn("library-health");
      setHealth(data);
    } catch (e: any) {
      toast.error(`Health check failed: ${e.message}`);
    } finally {
      setHealthLoading(false);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setLastSyncResponse(null);
    try {
      const data = await callFn("sync-bread-authority", { body: JSON.stringify({ dryRun: syncDryRun }) });
      setLastSyncResponse(data);
      toast.success(syncDryRun ? "Dry-run complete" : "Sync complete");
      await Promise.all([loadRuns(), loadHealth()]);
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const runAutoWelcomeDry = async () => {
    setWelcomeBusy(true);
    setWelcomeResponse(null);
    try {
      const data = await callFn("auto-welcome", {
        body: JSON.stringify({ dryRun: true, newMemberDays: welcomeNewDays, backlogLimit: welcomeBacklog }),
      });
      setWelcomeResponse(data);
      toast.success(`Previewed ${data.drafted ?? 0} draft(s)`);
    } catch (e: any) {
      toast.error(`Dry-run failed: ${e.message}`);
    } finally {
      setWelcomeBusy(false);
    }
  };

  useEffect(() => {
    if (savedKey) {
      void loadRuns();
      void loadHealth();
    } else {
      void loadRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const lastSuccessByTable = (() => {
    const out: Record<string, { when: string; delta: number } | null> = {};
    for (const t of TABLES) out[t] = null;
    for (const r of runs) {
      if (r.status !== "completed" || r.dry_run) continue;
      for (const t of TABLES) {
        if (out[t]) continue;
        const d = r.deltas?.[t];
        const ins = r.inserted?.[t] ?? 0;
        if (d || ins > 0) out[t] = { when: r.finished_at || r.started_at, delta: d?.delta ?? ins };
      }
      if (Object.values(out).every(Boolean)) break;
    }
    return out;
  })();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-6 px-4 space-y-6 flex-1">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">Admin</h1>
          <p className="text-muted-foreground">Sync the Bread Authority library, monitor health, and preview outreach drafts.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingest API key</CardTitle>
            <CardDescription>
              Stored only in your browser. Required to call sync, health, and auto-welcome.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="ingest-key" className="sr-only">Ingest API key</Label>
              <Input
                id="ingest-key"
                type="password"
                placeholder="Paste INGEST_API_KEY"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <Button onClick={saveKey} disabled={!apiKey || apiKey === savedKey}>Save</Button>
            {savedKey && <Badge variant="secondary">Key set</Badge>}
          </CardContent>
        </Card>

        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync"><RefreshCw className="h-4 w-4 mr-1" /> Sync</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1" /> History</TabsTrigger>
            <TabsTrigger value="health"><Activity className="h-4 w-4 mr-1" /> Health</TabsTrigger>
            <TabsTrigger value="welcome"><BeakerIcon className="h-4 w-4 mr-1" /> Auto-welcome dry-run</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run sync-bread-authority</CardTitle>
                <CardDescription>Pulls topics + entries from the library cache and refreshes content tables.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch id="dry" checked={syncDryRun} onCheckedChange={setSyncDryRun} />
                  <Label htmlFor="dry">Dry run (no writes)</Label>
                </div>
                <Button onClick={runSync} disabled={syncing || !savedKey}>
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {syncDryRun ? "Run dry-run" : "Run sync"}
                </Button>

                {lastSyncResponse && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={lastSyncResponse.error ? "destructive" : "default"}>
                        {lastSyncResponse.status || (lastSyncResponse.error ? "failed" : "ok")}
                      </Badge>
                      {lastSyncResponse.dryRun && <Badge variant="outline">dry run</Badge>}
                      <Badge variant="secondary">topics: {lastSyncResponse.topics ?? 0}</Badge>
                      <Badge variant="secondary">entries: {lastSyncResponse.entriesSeen ?? 0}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead className="text-right">Inserted</TableHead>
                          <TableHead className="text-right">Skipped</TableHead>
                          <TableHead className="text-right">Delta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TABLES.map((t) => {
                          const d = lastSyncResponse.deltas?.[t];
                          return (
                            <TableRow key={t}>
                              <TableCell className="font-mono text-xs">{t}</TableCell>
                              <TableCell className="text-right">{lastSyncResponse.inserted?.[t] ?? 0}</TableCell>
                              <TableCell className="text-right">{lastSyncResponse.skippedExistingTitle?.[t] ?? 0}</TableCell>
                              <TableCell className="text-right">{d ? fmtDelta(d.delta) : "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {Array.isArray(lastSyncResponse.topicErrors) && lastSyncResponse.topicErrors.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Topic errors ({lastSyncResponse.topicErrors.length})</p>
                        <ul className="text-xs text-destructive space-y-1">
                          {lastSyncResponse.topicErrors.map((e: string, i: number) => <li key={i}>• {e}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Last successful sync by table</CardTitle>
                  <CardDescription>From recorded run history (excludes dry runs).</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadRuns} disabled={runsLoading}>
                  {runsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Last seen</TableHead>
                      <TableHead className="text-right">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TABLES.map((t) => (
                      <TableRow key={t}>
                        <TableCell className="font-mono text-xs">{t}</TableCell>
                        <TableCell>{lastSuccessByTable[t] ? fmtDate(lastSuccessByTable[t]!.when) : "—"}</TableCell>
                        <TableCell className="text-right">{lastSuccessByTable[t] ? fmtDelta(lastSuccessByTable[t]!.delta) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run history</CardTitle>
                <CardDescription>Most recent 25 runs.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Topics</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead>Inserted</TableHead>
                      <TableHead>Deltas</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No runs yet</TableCell></TableRow>
                    )}
                    {runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{fmtDate(r.started_at)}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "completed" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{r.dry_run ? <Badge variant="outline">dry</Badge> : <Badge variant="secondary">live</Badge>}</TableCell>
                        <TableCell className="text-right">{r.topics_seen}</TableCell>
                        <TableCell className="text-right">{r.entries_seen}</TableCell>
                        <TableCell className="text-xs">
                          {TABLES.map((t) => `${t.split("_")[0]}:${r.inserted?.[t] ?? 0}`).join("  ")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {TABLES.map((t) => {
                            const d = r.deltas?.[t];
                            return d ? `${t.split("_")[0]}:${fmtDelta(d.delta)}` : "";
                          }).filter(Boolean).join("  ")}
                        </TableCell>
                        <TableCell className="text-right text-xs">{r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
                        <TableCell className="text-xs">
                          {r.error_message ? <span className="text-destructive">{r.error_message}</span>
                            : Array.isArray(r.topic_errors) && r.topic_errors.length > 0
                              ? `${r.topic_errors.length} topic`
                              : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Library health</CardTitle>
                  <CardDescription>Verifies counts, recent sync, and missing-source rows.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadHealth} disabled={healthLoading || !savedKey}>
                  {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Re-check"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {!health && <p className="text-sm text-muted-foreground">No health data yet.</p>}
                {health && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={health.ok ? "default" : "destructive"}>{health.ok ? "Healthy" : "Issues"}</Badge>
                      <Badge variant="secondary">checked {fmtDate(health.checkedAt)}</Badge>
                      <Badge variant={health.staleSync ? "destructive" : "outline"}>
                        last sync {fmtDate(health.lastSyncAt)}
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Bread Authority</TableHead>
                          <TableHead className="text-right">Manual</TableHead>
                          <TableHead className="text-right">Missing source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TABLES.map((t) => {
                          const row = health.tables[t];
                          if (!row) return null;
                          return (
                            <TableRow key={t}>
                              <TableCell className="font-mono text-xs">{t}</TableCell>
                              <TableCell className="text-right">{row.total}</TableCell>
                              <TableCell className="text-right">{row.bread_authority}</TableCell>
                              <TableCell className="text-right">{row.manual}</TableCell>
                              <TableCell className={`text-right ${row.missing_source > 0 ? "text-destructive font-medium" : ""}`}>{row.missing_source}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {health.issues.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-1">Issues</p>
                        <ul className="text-xs text-destructive space-y-1">
                          {health.issues.map((i, idx) => <li key={idx}>• {i}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="welcome" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Auto-welcome dry-run</CardTitle>
                <CardDescription>Generates drafts in memory only — nothing is written to outreach_messages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <div>
                    <Label htmlFor="new-days">New-member window (days)</Label>
                    <Input id="new-days" type="number" min={1} max={60}
                      value={welcomeNewDays} onChange={(e) => setWelcomeNewDays(Number(e.target.value) || 7)} />
                  </div>
                  <div>
                    <Label htmlFor="backlog">Backlog limit</Label>
                    <Input id="backlog" type="number" min={0} max={50}
                      value={welcomeBacklog} onChange={(e) => setWelcomeBacklog(Number(e.target.value) || 0)} />
                  </div>
                </div>
                <Button onClick={runAutoWelcomeDry} disabled={welcomeBusy || !savedKey}>
                  {welcomeBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BeakerIcon className="h-4 w-4 mr-2" />}
                  Preview drafts
                </Button>

                {welcomeResponse && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge>candidates {welcomeResponse.candidates}</Badge>
                      <Badge variant="secondary">new {welcomeResponse.newJoiners}</Badge>
                      <Badge variant="secondary">backlog {welcomeResponse.backlogConsidered}</Badge>
                      <Badge variant="default">drafted {welcomeResponse.drafted}</Badge>
                      {welcomeResponse.failed > 0 && <Badge variant="destructive">failed {welcomeResponse.failed}</Badge>}
                      {welcomeResponse.stoppedOnRateLimit && <Badge variant="destructive">rate-limited</Badge>}
                    </div>
                    <div className="space-y-3">
                      {(welcomeResponse.results || []).map((r: any, idx: number) => (
                        <Card key={idx}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{r.member}</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline">{r.type}</Badge>
                                <Badge variant="secondary">joined {r.joinedDaysAgo}d ago</Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <p className="text-sm whitespace-pre-wrap">{r.preview}</p>
                            {Array.isArray(r.matched) && r.matched.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {r.matched.map((m: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">{m?.title || String(m)}</Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}