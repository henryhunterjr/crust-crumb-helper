import { useState, useMemo } from 'react';
import { Upload, FileJson, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Member } from '@/types/member';
import { PreviewRow } from '@/types/compass';
import { parseIncoming, matchSources } from '@/lib/compassMatch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onCommit: (rows: PreviewRow[]) => Promise<{ inserted: number; duplicates: number }>;
  isCommitting: boolean;
}

export function ImportIntroductionsDialog({
  open,
  onOpenChange,
  members,
  onCommit,
  isCommitting,
}: Props) {
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);

  const candidates = useMemo(
    () => members.map((m) => ({ id: m.id, skool_name: m.skool_name, skool_username: m.skool_username })),
    [members]
  );

  const handleFile = async (file: File) => {
    const text = await file.text();
    setRaw(text);
    setPreview(null);
  };

  const handlePreview = () => {
    const { rows, format } = parseIncoming(raw);
    if (format === 'invalid-json') {
      toast.error('That looks like JSON but it will not parse. Check the file.');
      return;
    }
    if (rows.length === 0) {
      toast.error('No records found. Paste JSON, CSV, or "Name (@username)" blocks.');
      return;
    }
    setPreview(matchSources(rows, candidates));
    toast.success(`Parsed ${rows.length} record${rows.length === 1 ? '' : 's'} as ${format}.`);
  };

  const counts = useMemo(() => {
    const p = preview || [];
    return {
      matched: p.filter((r) => r.matchStatus === 'matched').length,
      ambiguous: p.filter((r) => r.matchStatus === 'ambiguous').length,
      unmatched: p.filter((r) => r.matchStatus === 'unmatched').length,
    };
  }, [preview]);

  const handleCommit = async () => {
    if (!preview) return;
    try {
      const res = await onCommit(preview);
      toast.success(
        `Saved ${res.inserted} source${res.inserted === 1 ? '' : 's'}.` +
          (res.duplicates ? ` ${res.duplicates} already captured.` : '') +
          (counts.ambiguous + counts.unmatched
            ? ` ${counts.ambiguous + counts.unmatched} sent to review.`
            : '')
      );
      setRaw('');
      setPreview(null);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save sources');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Import Introductions
          </DialogTitle>
          <DialogDescription>
            Paste or upload JSON, CSV, or plain blocks. Nothing is saved until you review the
            match preview. Ambiguous and unmatched records go to a review queue, never merged
            silently.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            {!preview && (
              <>
                <div>
                  <Label htmlFor="introFile" className="text-xs text-muted-foreground">
                    Upload a .json, .csv or .txt file
                  </Label>
                  <input
                    id="introFile"
                    type="file"
                    accept=".json,.csv,.txt"
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </div>

                <div>
                  <Label htmlFor="introRaw" className="text-xs text-muted-foreground">
                    Or paste here
                  </Label>
                  <Textarea
                    id="introRaw"
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder={
                      'Jane Baker (@jane-baker-1234)\nI just started sourdough and my loaves come out flat.\n\nTom Rye\nWant to learn baguettes for the farmers market.'
                    }
                    className="mt-1 min-h-[180px] font-mono text-xs"
                  />
                </div>
              </>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-[hsl(142,76%,36%)] text-primary-foreground">
                    {counts.matched} matched
                  </Badge>
                  {counts.ambiguous > 0 && (
                    <Badge className="bg-[hsl(30,100%,50%)] text-primary-foreground">
                      {counts.ambiguous} ambiguous
                    </Badge>
                  )}
                  {counts.unmatched > 0 && (
                    <Badge variant="outline">{counts.unmatched} unmatched</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  {preview.map((row, i) => (
                    <div key={i} className="rounded-md border p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {row.author || 'Unknown author'}
                            {row.username ? (
                              <span className="text-muted-foreground"> @{row.username}</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{row.matchNote}</p>
                        </div>
                        {row.matchStatus === 'matched' ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(142,76%,36%)]" />
                        ) : row.matchStatus === 'ambiguous' ? (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(30,100%,50%)]" />
                        ) : (
                          <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </div>
                      {row.matchedMemberName && (
                        <p className="mt-1 text-xs">
                          → <strong>{row.matchedMemberName}</strong>
                        </p>
                      )}
                      <p className="mt-2 line-clamp-3 text-xs italic text-muted-foreground">
                        {row.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Back to edit
              </Button>
              <Button onClick={handleCommit} disabled={isCommitting}>
                <Upload className="mr-2 h-4 w-4" />
                {isCommitting ? 'Saving…' : `Save ${preview.length} source${preview.length === 1 ? '' : 's'}`}
              </Button>
            </>
          ) : (
            <Button onClick={handlePreview} disabled={!raw.trim()}>
              Preview matches
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
