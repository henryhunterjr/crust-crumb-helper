import { useState, useMemo } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useMemberTags, getTagColor } from '@/hooks/useMemberTags';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BulkTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberIds: string[];
}

export function BulkTagDialog({ open, onOpenChange, memberIds }: BulkTagDialogProps) {
  const { allTags, tagsByMember, bulkAddTags, removeTag } = useMemberTags();
  const [search, setSearch] = useState('');
  const [tagsToAdd, setTagsToAdd] = useState<Set<string>>(new Set());
  const [tagsToRemove, setTagsToRemove] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);

  const allUniqueTags = useMemo(() => {
    const tags = new Set(allTags.map(t => t.tag));
    return Array.from(tags).sort();
  }, [allTags]);

  const filteredTags = useMemo(() => {
    return allUniqueTags.filter(t => !search || t.toLowerCase().includes(search.toLowerCase()));
  }, [allUniqueTags, search]);

  // Tags that exist on at least one selected member (can be removed)
  const removableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const id of memberIds) {
      for (const t of (tagsByMember[id] || [])) {
        tags.add(t.tag);
      }
    }
    return tags;
  }, [memberIds, tagsByMember]);

  const toggleAdd = (tag: string) => {
    setTagsToAdd(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
    // Remove from remove set if added
    setTagsToRemove(prev => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  };

  const toggleRemove = (tag: string) => {
    setTagsToRemove(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
    setTagsToAdd(prev => {
      const next = new Set(prev);
      next.delete(tag);
      return next;
    });
  };

  const canCreateNew = search.trim().length > 0 && 
    !allUniqueTags.includes(search.trim().toLowerCase().replace(/\s+/g, '-'));

  const handleCreateAndAdd = () => {
    const newTag = search.trim().toLowerCase().replace(/\s+/g, '-');
    if (newTag) {
      setTagsToAdd(prev => new Set(prev).add(newTag));
      setSearch('');
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      // Add tags
      if (tagsToAdd.size > 0) {
        const entries = memberIds.flatMap(memberId =>
          Array.from(tagsToAdd).map(tag => ({ member_id: memberId, tag, source: 'manual' }))
        );
        await bulkAddTags.mutateAsync(entries);
      }

      // Remove tags
      if (tagsToRemove.size > 0) {
        for (const memberId of memberIds) {
          const memberTagRecords = tagsByMember[memberId] || [];
          for (const tagRecord of memberTagRecords) {
            if (tagsToRemove.has(tagRecord.tag)) {
              await removeTag.mutateAsync(tagRecord.id);
            }
          }
        }
      }

      const parts: string[] = [];
      if (tagsToAdd.size > 0) parts.push(`Added [${Array.from(tagsToAdd).join(', ')}] to ${memberIds.length} members`);
      if (tagsToRemove.size > 0) parts.push(`Removed [${Array.from(tagsToRemove).join(', ')}] from ${memberIds.length} members`);
      toast.success(parts.join('. '));

      setTagsToAdd(new Set());
      setTagsToRemove(new Set());
      setSearch('');
      onOpenChange(false);
    } catch {
      toast.error('Failed to apply tags');
    } finally {
      setIsApplying(false);
    }
  };

  const totalChanges = tagsToAdd.size + tagsToRemove.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tag {memberIds.length} Selected Members</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Summary of pending changes */}
        {totalChanges > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Array.from(tagsToAdd).map(tag => (
              <Badge key={`add-${tag}`} variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                <Plus className="h-3 w-3" /> {tag}
              </Badge>
            ))}
            {Array.from(tagsToRemove).map(tag => (
              <Badge key={`rm-${tag}`} variant="outline" className="text-xs gap-1 bg-destructive/10 text-destructive border-destructive/30">
                <Minus className="h-3 w-3" /> {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Add tags</p>
            <ScrollArea className="max-h-32 border rounded-md p-1">
              {filteredTags.map(tag => (
                <label key={`add-${tag}`} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                  <Checkbox
                    checked={tagsToAdd.has(tag)}
                    onCheckedChange={() => toggleAdd(tag)}
                  />
                  <span className={cn("text-xs", getTagColor(tag).split(' ').filter(c => c.startsWith('text-')).join(' '))}>{tag}</span>
                </label>
              ))}
              {canCreateNew && (
                <button
                  onClick={handleCreateAndAdd}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent text-primary font-medium"
                >
                  + Create "{search.trim().toLowerCase().replace(/\s+/g, '-')}"
                </button>
              )}
            </ScrollArea>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Remove tags</p>
            <ScrollArea className="max-h-32 border rounded-md p-1">
              {Array.from(removableTags).sort().filter(t => !search || t.toLowerCase().includes(search.toLowerCase())).map(tag => (
                <label key={`rm-${tag}`} className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-sm">
                  <Checkbox
                    checked={tagsToRemove.has(tag)}
                    onCheckedChange={() => toggleRemove(tag)}
                  />
                  <span className="text-xs">{tag}</span>
                </label>
              ))}
              {removableTags.size === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">No tags to remove</p>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={totalChanges === 0 || isApplying}>
            {isApplying ? 'Applying...' : `Apply ${totalChanges} Change${totalChanges !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
