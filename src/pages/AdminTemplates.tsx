import { useState } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOutreachTemplates, type OutreachTemplate, type OutreachChannel } from '@/hooks/useOutreachTemplates';

const SEGMENTS = [
  'cca_all','cca_super_engaged','cca_leads','cca_customers','cca_not_yet_fotm',
  'fotm_all','fotm_founding','fotm_paid_course','fotm_prospects',
  'newsletter_subscribers','csv_upload',
];

type Draft = Partial<OutreachTemplate> & { key: string; name: string; body: string; channel: OutreachChannel };

const emptyDraft: Draft = {
  key: '', name: '', description: '', channel: 'both', segment_key: null,
  subject: '', body: '', merge_tags: ['first_name'], daily_cap: 500, dedupe_days: 30, is_active: true,
};

export default function AdminTemplates() {
  const { data: templates = [], isLoading, upsert, remove } = useOutreachTemplates();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const openNew = () => { setDraft(emptyDraft); setOpen(true); };
  const openEdit = (t: OutreachTemplate) => { setDraft({ ...t, channel: t.channel }); setOpen(true); };

  const save = async () => {
    if (!draft.key || !draft.name || !draft.body) {
      toast.error('Key, name, and body are required'); return;
    }
    try {
      await upsert.mutateAsync(draft as any);
      toast.success(draft.id ? 'Template updated' : 'Template created');
      setOpen(false);
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const del = async (t: OutreachTemplate) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try { await remove.mutateAsync(t.id); toast.success('Deleted'); }
    catch (e: any) { toast.error(e.message || 'Delete failed'); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="container flex-1 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Outreach Templates</h1>
            <p className="text-muted-foreground text-sm">Reusable DM and email templates targeted by segment.</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New template</Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : templates.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No templates yet. Create your first one.</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map(t => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{t.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono truncate">{t.key}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{t.channel}</Badge>
                    {t.segment_key && <Badge variant="outline">{t.segment_key}</Badge>}
                    {!t.is_active && <Badge variant="destructive">inactive</Badge>}
                    <Badge variant="outline">cap {t.daily_cap}/day</Badge>
                    <Badge variant="outline">dedupe {t.dedupe_days}d</Badge>
                  </div>
                  {t.subject && <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {t.subject}</p>}
                  <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto whitespace-pre-wrap">{t.body}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>{draft.id ? 'Edit template' : 'New template'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Key (unique)</Label>
                  <Input value={draft.key} onChange={e => setDraft({ ...draft, key: e.target.value })} placeholder="cca_to_fotm_invite_2026_06_29" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={draft.description || ''} onChange={e => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Channel</Label>
                  <Select value={draft.channel} onValueChange={(v: OutreachChannel) => setDraft({ ...draft, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="skool_dm">Skool DM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Segment</Label>
                  <Select value={draft.segment_key || 'none'} onValueChange={v => setDraft({ ...draft, segment_key: v === 'none' ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">(none)</SelectItem>
                      {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={draft.is_active !== false} onCheckedChange={c => setDraft({ ...draft, is_active: c })} />
                  <span className="text-sm">Active</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Daily cap</Label>
                  <Input type="number" value={draft.daily_cap ?? 500} onChange={e => setDraft({ ...draft, daily_cap: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Dedupe window (days)</Label>
                  <Input type="number" value={draft.dedupe_days ?? 30} onChange={e => setDraft({ ...draft, dedupe_days: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Email subject (optional)</Label>
                <Input value={draft.subject || ''} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
              </div>
              <div>
                <Label>Body (supports {'{{first_name}}'} merge tag)</Label>
                <Textarea rows={12} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}