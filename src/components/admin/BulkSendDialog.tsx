// Bulk-send an outreach template to a segment. Calls the outreach-bulk-send
// edge function with the admin's saved INGEST_API_KEY (same key used by the
// Admin panel / Hermes integration). Enforces 30-day dedupe + 500/day cap
// server-side; this dialog is just a friendly trigger.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const KEY_STORAGE = 'lovable.ingestApiKey';
const FN_URL = 'https://anponqqhjugwflakydsf.supabase.co/functions/v1/outreach-bulk-send';

interface Template {
  id: string; key: string; name: string; channel: string;
  segment_key: string | null; daily_cap: number | null; dedupe_days: number | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSegment?: string;
}

export function BulkSendDialog({ open, onOpenChange, defaultSegment }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateKey, setTemplateKey] = useState<string>('');
  const [segmentKey, setSegmentKey] = useState<string>(defaultSegment || '');
  const [limit, setLimit] = useState<number>(500);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setDryRun(true);
    (async () => {
      const { data } = await supabase
        .from('outreach_templates' as any)
        .select('id,key,name,channel,segment_key,daily_cap,dedupe_days,is_active')
        .eq('is_active', true)
        .order('name');
      const list = (data as unknown as Template[]) || [];
      setTemplates(list);
      if (!templateKey && list.length) setTemplateKey(list[0].key);
    })();
  }, [open]);

  useEffect(() => {
    if (defaultSegment) setSegmentKey(defaultSegment);
  }, [defaultSegment]);

  const selected = templates.find((t) => t.key === templateKey);

  const run = async () => {
    const key = localStorage.getItem(KEY_STORAGE);
    if (!key) {
      toast.error('Save your INGEST_API_KEY on the /admin page first.');
      return;
    }
    if (!templateKey) {
      toast.error('Pick a template.');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          templateKey,
          segmentKey: segmentKey || undefined,
          limit,
          dryRun,
          triggeredBy: 'ui',
          triggeredByUser: userData.user?.email || 'admin',
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setResult(body);
      toast.success(dryRun
        ? `Dry run: would enqueue ${body.would_enqueue}, skipping ${body.skipped_dedupe} (dedupe).`
        : `Enqueued ${body.enqueued}, skipped ${body.skipped_dedupe} (dedupe).`);
    } catch (e: any) {
      toast.error(e.message || 'Bulk send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk send outreach</DialogTitle>
          <DialogDescription>
            Enqueues into the audit log. 30-day dedupe + 500/day cap per template are enforced server-side.
            DMs are picked up by the Chrome extension; emails by the Resend pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Template</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger><SelectValue placeholder="Choose template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.name} <span className="text-muted-foreground text-xs ml-1">({t.channel})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground mt-1">
                Cap: {Math.min(selected.daily_cap || 500, 500)}/day · Dedupe: {selected.dedupe_days || 30} days
              </p>
            )}
          </div>

          <div>
            <Label>Segment key</Label>
            <Input
              placeholder={selected?.segment_key || 'e.g. cca_not_yet_fotm'}
              value={segmentKey}
              onChange={(e) => setSegmentKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to use the template's default segment.
            </p>
          </div>

          <div>
            <Label>Batch limit</Label>
            <Input type="number" min={1} max={500} value={limit}
              onChange={(e) => setLimit(Math.max(1, Math.min(500, Number(e.target.value) || 1)))} />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} />
            Dry run (count only, nothing enqueued)
          </label>

          {result && (
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-48">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Close</Button>
          <Button onClick={run} disabled={busy || !templateKey}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            {dryRun ? 'Preview' : 'Enqueue send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}