import { Badge } from '@/components/ui/badge';
import { MemberTag, getTagColor } from '@/hooks/useMemberTags';
import { cn } from '@/lib/utils';

interface MemberTagBadgesProps {
  tags: MemberTag[];
  maxVisible?: number;
  className?: string;
}

export function MemberTagBadges({ tags, maxVisible = 4, className }: MemberTagBadgesProps) {
  if (tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0 h-5 font-medium", getTagColor(tag.tag))}
        >
          {tag.tag}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-medium bg-muted text-muted-foreground">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
