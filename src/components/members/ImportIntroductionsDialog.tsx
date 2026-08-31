import { useMemo, useState } from 'react';
import { Upload, Users, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Member } from '@/types/member';
import type { IntroductionPreviewRow } from '@/types/memberCompass';
import { parseIntroductionImport, previewIntroductionMatches } from '@/lib/memberCompass';
import { analyzeImportedMembers, useImportIntroductionSources } from '@/hooks/useMemberCompass';
import { toast } from 'sonner';

const INTRO_THREAD = 'https://www.skool.com/crust-crumb-academy-7621/we-talk-about-bread-every-day-today-i-want-to-know-about-you?p=53fb52ef';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onFinished?: () => void;
}

export function ImportIntroductionsDialog({ open, onOpenChange, members, onFinished }: Props) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<IntroductionPreviewRow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const importer = useImportIntroductionSources();
  const sortedMembers = useMemo(() => [...members].sort((a, b) => a.skool_name.localeCompare(b.skool_name)), [members]);

  const counts = useMemo(() => preview.reduce((acc, row) => {
    const status = row.selectedMemberId ? 'matched' : row.matchStatus;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [preview]);

  const buildPreview = () => {
    const parsed = parseIntroductionImport(raw).map((row) => ({
      ...row,
      sourceUrl: row.sourceUrl || INTRO_THREAD,
    }));
    if (!parsed.length) {
      toast.error('I could not find introduction records. Paste the JSON copied by Krusty, or CSV with author and text columns.');
      return;
    }
    setPreview(previewIntroductionMatches(parsed, members));
  };

  const chooseMember = (key: string, memberId: string) => {
    setPreview((rows) => rows.map((row) => row.key === key ? { ...row, selectedMemberId: memberId || null } : row));
  };

  const handleImport = async () => {
    if (!preview.length) return;
    try {
      const result = await importer.mutateAsync(preview);
      toast.success(`Saved ${result.rows.length} introductions. ${result.matchedIds.length} matched to member profiles.`);
      if (result.matchedIds.length) {
        setIsAnalyzing(true);
        const firstBatch = result.matchedIds.slice(0, 10);
        const analyzed = await analyzeImportedMembers(firstBatch);
        if (analyzed.analyzed) toast.success(`Built ${analyzed.analyzed} Compass profiles from the first batch.`);
        if (result.matchedIds.length > firstBatch.length) {
          toast.info(`${result.matchedIds.length - firstBatch.length} matched introductions are queued for Compass analysis.`);
        }
      }
      onFinished?.();
      setRaw('');
      setPreview([]);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Introduction import failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Import Introductions</DialogTitle>
          <DialogDescription>
            Turn what members told you about themselves into usable Compass profiles. Exact Skool usernames match first, then exact normalized names. Ambiguous people are never merged automatically.
          </DialogDescription>
        </DialogHeader>

        {!preview.length ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium flex items-center gap-2"><FileJson className="h-4 w-4" />Best path</div>
              <p className="text-muted-foreground mt-1">On the introduction thread, scroll until all comments you want are loaded, then use Krusty’s “Capture for Member Compass” button. Paste the copied JSON here.</p>
            </div>
            <Textarea
              value={raw}
              onChange={(event) => setRaw(event.target.value)}
              placeholder={'Paste Krusty JSON here, or CSV with columns like author,username,text,sourceUrl,externalId'}
              className="min-h-[260px] font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={buildPreview} disabled={!raw.trim()}><Upload className="h-4 w-4 mr-2" />Preview matches</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 pb-2">
              <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />{counts.matched || 0} matched</Badge>
              <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />{counts.ambiguous || 0} ambiguous</Badge>
              <Badge variant="outline">{counts.unmatched || 0} unmatched</Badge>
            </div>
            <ScrollArea className="flex-1 border rounded-md">
              <div className="divide-y">
                {preview.map((row) => {
                  const effectiveMatched = Boolean(row.memberId || row.selectedMemberId);
                  return (
                    <div key={row.key} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{row.author}{row.username ? ` · @${row.username.replace(/^@/, '')}` : ''}</div>
                          <div className="text-xs text-muted-foreground">{effectiveMatched ? `Matched to ${row.memberName || sortedMembers.find((member) => member.id === row.selectedMemberId)?.skool_name || 'selected member'}` : row.matchStatus}</div>
                        </div>
                        {effectiveMatched ? <Badge variant="secondary">Matched</Badge> : <Badge variant="outline">Review</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{row.text}</p>
                      {!row.memberId && (
                        <select
                          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                          value={row.selectedMemberId || ''}
                          onChange={(event) => chooseMember(row.key, event.target.value)}
                        >
                          <option value="">Keep unmatched for later review</option>
                          {sortedMembers.map((member) => <option key={member.id} value={member.id}>{member.skool_name}{member.skool_username ? ` (@${member.skool_username})` : ''}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-between gap-2 pt-3">
              <Button variant="outline" onClick={() => setPreview([])}>Back</Button>
              <Button onClick={handleImport} disabled={importer.isPending || isAnalyzing}>
                {importer.isPending || isAnalyzing ? 'Saving Compass data…' : `Import ${preview.length} introductions`}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
