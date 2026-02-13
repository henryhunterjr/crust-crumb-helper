import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTagColor } from '@/hooks/useMemberTags';
import { cn } from '@/lib/utils';

interface TagFilterDropdownProps {
  tagCounts: Record<string, number>;
  selectedTags: string[];
  onSelectedTagsChange: (tags: string[]) => void;
}

export function TagFilterDropdown({ tagCounts, selectedTags, onSelectedTagsChange }: TagFilterDropdownProps) {
  const [open, setOpen] = useState(false);

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onSelectedTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onSelectedTagsChange([...selectedTags, tag]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Tags
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-[20px] text-xs">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">Filter by Tags</p>
          <p className="text-xs text-muted-foreground">AND logic: members must have all selected tags</p>
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {sortedTags.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No tags assigned yet</p>
            ) : (
              sortedTags.map(([tag, count]) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  />
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 h-5", getTagColor(tag))}
                  >
                    {tag}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">({count})</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
        {selectedTags.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onSelectedTagsChange([])}
            >
              Clear filters
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
