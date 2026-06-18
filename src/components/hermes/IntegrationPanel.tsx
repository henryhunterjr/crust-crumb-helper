import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = (supabase as any).supabaseUrl || '';
const BASE = `${SUPABASE_URL}/functions/v1`;

const ENDPOINTS = [
  { name: 'Manifest', method: 'GET', url: `${BASE}/hermes-manifest`, note: 'Full integration spec for Hermes.' },
  { name: 'List jobs', method: 'POST', url: `${BASE}/hermes-run`, body: `{"action":"list_jobs"}` },
  { name: 'List runs', method: 'POST', url: `${BASE}/hermes-run`, body: `{"action":"list_runs","limit":50}` },
  { name: 'Preview job', method: 'POST', url: `${BASE}/hermes-run`, body: `{"job_id":"<uuid>","trigger":"agent","dry_run":true}` },
  { name: 'Run job', method: 'POST', url: `${BASE}/hermes-run`, body: `{"job_id":"<uuid>","trigger":"agent","dry_run":false}` },
  { name: 'Read draft queue', method: 'GET', url: `${BASE}/hermes-queue?status=generated&limit=50`, note: 'Drafts waiting for manual send.' },
  { name: 'Mark sent', method: 'POST', url: `${BASE}/hermes-mark-sent`, body: `{"ids":["<uuid>"],"status":"sent"}` },
];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        toast.success('Copied');
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export function IntegrationPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Hermes integration</CardTitle>
          <CardDescription>
            REST endpoints the Hermes agent uses to read jobs, preview drafts, pull the queue, and mark items sent.
            All endpoints authenticate with <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer INGEST_API_KEY</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENDPOINTS.map((ep) => (
            <div key={ep.name} className="border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'}>{ep.method}</Badge>
                  <span className="font-medium text-sm">{ep.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <CopyButton text={ep.url} />
                  {ep.method === 'GET' && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={ep.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                    </Button>
                  )}
                </div>
              </div>
              <code className="block text-xs bg-muted/50 p-2 rounded break-all">{ep.url}</code>
              {ep.body && (
                <code className="block text-xs bg-muted/50 p-2 rounded break-all">body: {ep.body}</code>
              )}
              {ep.note && <p className="text-xs text-muted-foreground">{ep.note}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Operating rules Hermes follows</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Voice: direct, confident, warm, masculine, expert without gatekeeping. No em dashes. Banned words: ensure, dive, delve, enhance, tapestry, unveil, crucial.</p>
          <p>Skool: plain text only when posting. Max 10 new DM threads per week. 5 re-engagement DMs per day.</p>
          <p>Delivery: nothing auto-sends to Skool. Hermes drafts; Henry copies and posts; Hermes calls <code className="text-xs bg-muted px-1 rounded">mark-sent</code> after.</p>
          <p>Model: <code className="text-xs bg-muted px-1 rounded">google/gemini-3-flash-preview</code> via the Lovable AI Gateway.</p>
        </CardContent>
      </Card>
    </div>
  );
}