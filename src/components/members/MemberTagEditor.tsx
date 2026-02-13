import { useState, useMemo } from 'react';
import { X, Plus, Search, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMemberTags, getTagColor, MemberTag } from '@/hooks/useMemberTags';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MemberTagEditorProps {
  memberId: string;
}

export function MemberTagEditor({ memberId }: MemberTagEditorProps) {
  const { allTags, tagsByMember, addTag, removeTag } = useMemberTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const memberTags = tagsByMember[memberId] || [];
  const memberTagNames = new Set(memberTags.map(t => t.tag));

  // All unique tags in the system
  const allUniqueTags = useMemo(() => {
    const tags = new Set(allTags.map(t => t.tag));
    return Array.from(tags).sort();
  }, [allTags]);

  // Available tags (not already assigned)
  const availableTags = useMemo(() => {
    return allUniqueTags
      .filter(t => !memberTagNames.has(t))
      .filter(t => !search || t.toLowerCase().includes(search.toLowerCase()));
  }, [allUniqueTags, memberTagNames, search]);

  const canCreateNew = search.trim().length > 0 && 
    !allUniqueTags.includes(search.trim().toLowerCase().replace(/\s+/g, '-'));

  const handleAdd = async (tag: string) => {
    try {
      await addTag.mutateAsync({ memberId, tag, source: 'manual' });
      toast.success(`Added "${tag}"`);
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleRemove = async (tagRecord: MemberTag) => {
    try {
      await removeTag.mutateAsync(tagRecord.id);
      toast.success(`Removed "${tagRecord.tag}"`);
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const handleCreate = async () => {
    const newTag = search.trim().toLowerCase().replace(/\s+/g, '-');
    if (!newTag) return;
    await handleAdd(newTag);
    setSearch('');
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {memberTags.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No tags assigned</span>
        )}
        {memberTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className={cn("text-xs gap-1 pr-1", getTagColor(tag.tag))}
          >
            {tag.tag}
            {tag.source === 'auto' && (
              <span className="text-[10px] opacity-60 ml-0.5">auto</span>
            )}
            <button
              onClick={() => handleRemove(tag)}
              className="ml-0.5 hover:bg-foreground/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
              <Plus className="h-3 w-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2 bg-popover" align="start">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search or create tag"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs"
                autoFocus
              />
            </div>
            <ScrollArea className="max-h-40">
              <div className="space-y-0.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAdd(tag)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent transition-colors"
                  >
                    {tag}
                  </button>
                ))}
                {canCreateNew && (
                  <button
                    onClick={handleCreate}
                    className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent transition-colors text-primary font-medium"
                  >
                    + Create "{search.trim().toLowerCase().replace(/\s+/g, '-')}"
                  </button>
                )}
                {availableTags.length === 0 && !canCreateNew && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No tags available</p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Auto-tags are reassigned on import. Manual tags persist.
      </p>
    </div>
  );
}
