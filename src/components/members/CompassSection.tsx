import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Compass, RefreshCw, Save, ChevronDown, ExternalLink, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BakingStage, MemberCompassProfile, MemberSource, STAGE_LABELS } from '@/types/compass';

interface Props {
  memberId: string;
  profile: MemberCompassProfile | undefined;
  sources: MemberSource[];
  onAnalyze: () => Promise<void>;
  isAnalyzing: boolean;
  onSave: (updates: Partial<MemberCompassProfile>) => Promise<void>;
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="text-xs font-normal">
            {i}
          </Badge>
        ))}
      </div>
    </div>
  );
}

const toList = (v: string) =>
  v.split(',').map((s) => s.trim()).filter(Boolean);

export function CompassSection({
  memberId,
  profile,
  sources,
  onAnalyze,
  isAnalyzing,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [stage, setStage] = useState<BakingStage>(profile?.baking_stage || 'unknown');
  const [struggles, setStruggles] = useState('');
  const [goals, setGoals] = useState('');
  const [interests, setInterests] = useState('');
  const [why, setWhy] = useState('');
  const [hooks, setHooks] = useState('');
  const [action, setAction] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStage(profile?.baking_stage || 'unknown');
    setStruggles((profile?.struggles || []).join(', '));
    setGoals((profile?.learning_goals || []).join(', '));
    setInterests((profile?.bread_interests || []).join(', '));
    setWhy(profile?.why_they_bake || '');
    setHooks((profile?.personal_hooks || []).join(', '));
    setAction(profile?.next_best_action || '');
    setEditing(false);
  }, [profile, memberId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        baking_stage: stage,
        struggles: toList(struggles),
        learning_goals: toList(goals),
        bread_interests: toList(interests),
        why_they_bake: why.trim() || null,
        personal_hooks: toList(hooks),
        next_best_action: action.trim() || null,
      });
      toast.success('Compass insight saved');
      setEditing(false);
    } catch (e) {
      toast.error((e as Error).message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">What can we help them do next?</span>
        </div>
        <div className="flex gap-1">
          {profile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing((e) => !e)}
              aria-label="Edit compass insight"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onAnalyze} disabled={isAnalyzing}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {profile ? 'Re-analyze' : 'Analyze'}
          </Button>
        </div>
      </div>

      {!profile && !isAnalyzing && (
        <p className="mt-2 text-xs text-muted-foreground">
          No Compass insight yet. Analyze uses only their own words, nothing invented.
        </p>
      )}

      {profile && !editing && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {STAGE_LABELS[profile.baking_stage]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {profile.insight_confidence} confidence
            </Badge>
            {profile.manually_edited && (
              <Badge variant="secondary" className="text-xs">
                edited by hand
              </Badge>
            )}
          </div>

          {profile.next_best_action && (
            <div className="rounded-md bg-background p-2.5">
              <Label className="text-xs text-muted-foreground">Next best action</Label>
              <p className="mt-0.5 text-sm">{profile.next_best_action}</p>
            </div>
          )}

          <ChipList label="Struggles" items={profile.struggles} />
          <ChipList label="Learning goals" items={profile.learning_goals} />
          <ChipList label="Bread interests" items={profile.bread_interests} />
          <ChipList label="Personal hooks" items={profile.personal_hooks} />

          {profile.why_they_bake && (
            <div>
              <Label className="text-xs text-muted-foreground">Why they bake</Label>
              <p className="mt-0.5 text-sm">{profile.why_they_bake}</p>
            </div>
          )}

          {profile.member_language?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Their words</Label>
              <ul className="mt-1 space-y-0.5">
                {profile.member_language.map((p) => (
                  <li key={p} className="text-xs italic text-muted-foreground">
                    "{p}"
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Recommended resource</Label>
            {profile.recommended_resource_title ? (
              <p className="mt-0.5 text-sm">
                {profile.recommended_resource_url ? (
                  <a
                    href={profile.recommended_resource_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline"
                  >
                    {profile.recommended_resource_title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  profile.recommended_resource_title
                )}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({profile.recommended_resource_type})
                </span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-muted-foreground">
                No matching resource in the library. Personal coaching follow-up from Henry.
              </p>
            )}
          </div>

          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Source and provenance ({sources.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {profile.source_summary && (
                <p className="text-xs text-muted-foreground">{profile.source_summary}</p>
              )}
              {sources.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Based on their application answer only.
                </p>
              )}
              {sources.map((s) => (
                <div key={s.id} className="rounded-md bg-background p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                    <span>{s.source_type}</span>
                    <span>{format(parseISO(s.captured_at), 'MMM d, yyyy')}</span>
                    {s.source_url && (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-primary underline"
                      >
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap italic">{s.source_text}</p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          <p className="text-xs text-muted-foreground">
            Last analyzed:{' '}
            {profile.last_analyzed_at
              ? format(parseISO(profile.last_analyzed_at), 'MMM d, yyyy')
              : 'never'}
          </p>
        </div>
      )}

      {profile && editing && (
        <div className="mt-3 space-y-3">
          <div>
            <Label className="text-xs">Baking stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as BakingStage)}>
              <SelectTrigger className="mt-1 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STAGE_LABELS) as BakingStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {[
            { label: 'Struggles (comma separated)', value: struggles, set: setStruggles },
            { label: 'Learning goals (comma separated)', value: goals, set: setGoals },
            { label: 'Bread interests (comma separated)', value: interests, set: setInterests },
            { label: 'Personal hooks (comma separated)', value: hooks, set: setHooks },
          ].map((f) => (
            <div key={f.label}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
          ))}
          <div>
            <Label className="text-xs">Why they bake</Label>
            <Input value={why} onChange={(e) => setWhy(e.target.value)} className="mt-1 h-9" />
          </div>
          <div>
            <Label className="text-xs">Next best action</Label>
            <Textarea
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1 min-h-[60px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save insight
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
