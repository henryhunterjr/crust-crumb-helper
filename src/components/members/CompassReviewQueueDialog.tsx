import { useState } from 'react';
import { Inbox } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Member } from '@/types/member';
import { MemberSource } from '@/types/compass';
import { normalizeName } from '@/lib/compassMatch';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue: MemberSource[];
  members: Member[];
  onResolve: (input: { id: string; memberId: string | null }) => Promise<unknown>;
}

export function CompassReviewQueueDialog({ open, onOpenChange, queue, members, onResolve }: Props) {
  const [search, setSearch] = useState<Record<string, string>>({});

  const suggestions = (source: MemberSource) => {
    const term = (search[source.id] ?? source.source_author ?? '').trim();
    if (!term) return [];
    const n = normalizeName(term);
    return members
      .filter(
        (m) =>
          normalizeName(m.skool_name).includes(n) ||
          (m.skool_username || '').toLowerCase().includes(n)
      )
      .slice(0, 6);
  };

  const handleAssign = async (id: string, memberId: string | null) => {
    try {
      await onResolve({ id, memberId });
      toast.success(memberId ? 'Source attached to member' : 'Source ignored');
    } catch (e) {
      toast.error((e as Error).message || 'Could not update source');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Review Queue
          </DialogTitle>
          <DialogDescription>
            Captured text we could not confidently match. Nothing here touches a member record
            until you assign it by hand.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          {queue.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing waiting. Every captured source is matched.
            </p>
          ) : (
            <div className="space-y-3">
              {queue.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {s.source_author || 'Unknown author'}
                    </span>
                    {s.source_author_username && (
                      <span className="text-xs text-muted-foreground">
                        @{s.source_author_username}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {s.match_status}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-4 text-xs italic text-muted-foreground">
                    {s.source_text}
                  </p>

                  <Input
                    value={search[s.id] ?? s.source_author ?? ''}
                    onChange={(e) => setSearch((p) => ({ ...p, [s.id]: e.target.value }))}
                    placeholder="Search members…"
                    className="mt-3 h-8 text-sm"
                  />

                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions(s).map((m) => (
                      <Button
                        key={m.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(s.id, m.id)}
                      >
                        {m.skool_name}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => handleAssign(s.id, null)}
                    >
                      Ignore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
