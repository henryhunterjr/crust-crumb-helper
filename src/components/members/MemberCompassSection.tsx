import { useEffect, useState } from 'react';
import { Brain, RefreshCw, Pencil, Save, ExternalLink, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Member } from '@/types/member';
import type { BakingStage, MemberCompassProfile } from '@/types/memberCompass';
import { useAnalyzeMemberCompass, useMemberCompassMember, useSaveMemberCompassProfile } from '@/hooks/useMemberCompass';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Props { member: Member; }

type Draft = Pick<MemberCompassProfile,
  'baking_stage' | 'struggles' | 'learning_goals' | 'bread_interests' | 'why_they_bake' | 'personal_hooks' | 'member_language' | 'next_best_action'
>;

const emptyDraft: Draft = {
  baking_stage: 'unknown',
  struggles: [],
  learning_goals: [],
  bread_interests: [],
  why_they_bake: null,
  personal_hooks: [],
  member_language: [],
  next_best_action: null,
};

const lines = (values?: string[]) => (values || []).join('\n');
const toArray = (value: string) => value.split(/\n|,/).map((part) => part.trim()).filter(Boolean);

export function MemberCompassSection({ member }: Props) {
  const { data, isLoading, refetch } = useMemberCompassMember(member.id);
  const save = useSaveMemberCompassProfile();
  const analyze = useAnalyzeMemberCompass();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (!data?.profile) {
      setDraft(emptyDraft);
      return;
    }
    setDraft({
      baking_stage: data.profile.baking_stage,
      struggles: data.profile.struggles || [],
      learning_goals: data.profile.learning_goals || [],
      bread_interests: data.profile.bread_interests || [],
      why_they_bake: data.profile.why_they_bake,
      personal_hooks: data.profile.personal_hooks || [],
      member_language: data.profile.member_language || [],
      next_best_action: data.profile.next_best_action,
    });
  }, [data?.profile]);

  const handleAnalyze = async () => {
    try {
      const result = await analyze.mutateAsync({ memberId: member.id, force: Boolean(data?.profile) });
      if (result?.skipped && result?.reason === 'no_source_text') {
        toast.info('There is no introduction or application answer to analyze yet.');
      } else {
        toast.success('Compass profile updated from this member’s own words.');
      }
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not analyze this member');
    }
  };

  const handleSave = async () => {
    try {
      await save.mutateAsync({ memberId: member.id, updates: draft });
      setEditing(false);
      toast.success('Compass profile saved');
      await refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save Compass profile');
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading Compass…</div>;
  const profile = data?.profile;
  const sources = data?.sources || [];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Member Compass</div>
          <p className="text-xs text-muted-foreground mt-1">What can we help this person do next?</p>
        </div>
        <div className="flex gap-2">
          {profile && !editing && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
          <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyze.isPending}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${analyze.isPending ? 'animate-spin' : ''}`} />
            {profile ? 'Re-analyze' : 'Build Compass'}
          </Button>
        </div>
      </div>

      {!profile && !editing ? (
        <p className="text-sm text-muted-foreground">No Compass profile yet. Import an introduction or use the member’s application answer, then build the profile.</p>
      ) : editing ? (
        <div className="space-y-3">
          <div>
            <Label>Baking stage</Label>
            <Select value={draft.baking_stage} onValueChange={(value) => setDraft((d) => ({ ...d, baking_stage: value as BakingStage }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Unknown</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="developing">Developing</SelectItem>
                <SelectItem value="confident">Confident</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <ListEditor label="Struggles" value={lines(draft.struggles)} onChange={(value) => setDraft((d) => ({ ...d, struggles: toArray(value) }))} />
            <ListEditor label="Learning goals" value={lines(draft.learning_goals)} onChange={(value) => setDraft((d) => ({ ...d, learning_goals: toArray(value) }))} />
            <ListEditor label="Bread interests" value={lines(draft.bread_interests)} onChange={(value) => setDraft((d) => ({ ...d, bread_interests: toArray(value) }))} />
            <ListEditor label="Personal things to remember" value={lines(draft.personal_hooks)} onChange={(value) => setDraft((d) => ({ ...d, personal_hooks: toArray(value) }))} />
          </div>
          <div><Label>Why they bake</Label><Input className="mt-1" value={draft.why_they_bake || ''} onChange={(event) => setDraft((d) => ({ ...d, why_they_bake: event.target.value || null }))} /></div>
          <ListEditor label="Their language / themes" value={lines(draft.member_language)} onChange={(value) => setDraft((d) => ({ ...d, member_language: toArray(value) }))} />
          <div><Label>Best next action</Label><Textarea className="mt-1" value={draft.next_best_action || ''} onChange={(event) => setDraft((d) => ({ ...d, next_best_action: event.target.value || null }))} /></div>
          <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button size="sm" onClick={handleSave} disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" />Save Compass</Button></div>
        </div>
      ) : profile ? (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2"><Badge variant="secondary" className="capitalize">{profile.baking_stage} baker</Badge>{profile.manually_edited && <Badge variant="outline">Manually edited</Badge>}</div>
          <CompassRow label="Struggling with" values={profile.struggles} />
          <CompassRow label="Wants to learn" values={profile.learning_goals} />
          <CompassRow label="Bread interests" values={profile.bread_interests} />
          {profile.why_they_bake && <TextRow label="Why they bake" value={profile.why_they_bake} />}
          <CompassRow label="Remember this" values={profile.personal_hooks} />
          <CompassRow label="Their words / themes" values={profile.member_language} />
          {profile.next_best_action && (
            <div className="rounded-md border bg-background p-3"><div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best next action</div><p className="mt-1 font-medium">{profile.next_best_action}</p></div>
          )}
          {profile.recommended_resource_title && profile.recommended_resource_url && (
            <div><div className="text-xs font-medium text-muted-foreground">Existing resource match</div><a className="inline-flex items-center gap-1 text-primary hover:underline mt-1" href={profile.recommended_resource_url} target="_blank" rel="noreferrer">{profile.recommended_resource_title}<ExternalLink className="h-3.5 w-3.5" /></a></div>
          )}
          {profile.last_analyzed_at && <p className="text-xs text-muted-foreground">Last analyzed {format(parseISO(profile.last_analyzed_at), 'MMM d, yyyy h:mm a')}</p>}
        </div>
      ) : null}

      {sources.length > 0 && (
        <details className="border-t pt-3 group">
          <summary className="cursor-pointer list-none text-sm font-medium flex items-center justify-between">Source evidence <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <div className="space-y-2 mt-3">
            {sources.map((source) => (
              <div key={source.id} className="rounded-md bg-background border p-3">
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2"><Badge variant="outline">{source.source_type.replace(/_/g, ' ')}</Badge>{source.source_author && <span>{source.source_author}</span>}</div>
                <p className="text-sm mt-2 whitespace-pre-wrap">{source.source_text}</p>
                {source.source_url && <a className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2" href={source.source_url} target="_blank" rel="noreferrer">Open source<ExternalLink className="h-3 w-3" /></a>}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function ListEditor({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div><Label>{label}</Label><Textarea className="mt-1 min-h-[76px]" value={value} onChange={(event) => onChange(event.target.value)} placeholder="One item per line" /></div>;
}

function CompassRow({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return <div><div className="text-xs font-medium text-muted-foreground">{label}</div><div className="flex flex-wrap gap-1.5 mt-1">{values.map((value) => <Badge key={value} variant="outline" className="font-normal">{value}</Badge>)}</div></div>;
}

function TextRow({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-medium text-muted-foreground">{label}</div><p className="mt-1">{value}</p></div>;
}
