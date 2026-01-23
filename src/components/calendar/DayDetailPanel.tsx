import { format } from 'date-fns';
import { Copy, Check, Edit, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ScheduledPost, POST_TYPES, TIME_SLOTS } from '@/types/postIdea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DayDetailPanelProps {
  selectedDate: Date;
  posts: ScheduledPost[];
  onAddPost: () => void;
  onEditPost: (post: ScheduledPost) => void;
  onDeletePost: (id: string) => void;
  onMarkPosted: (id: string) => void;
  onClose: () => void;
}

const STATUS_STYLES = {
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  skipped: 'bg-muted text-muted-foreground',
};

export function DayDetailPanel({
  selectedDate,
  posts,
  onAddPost,
  onEditPost,
  onDeletePost,
  onMarkPosted,
  onClose,
}: DayDetailPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (post: ScheduledPost) => {
    const fullPost = `${post.title}\n\n${post.content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopiedId(post.id);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getTimeSlotLabel = (slot: string | null) => {
    return TIME_SLOTS.find(t => t.value === slot)?.label || slot || 'Unscheduled';
  };

  const getPostTypeLabel = (type: string | null) => {
    return POST_TYPES.find(t => t.value === type)?.label || type;
  };

  // Sort posts by time slot
  const sortedPosts = [...posts].sort((a, b) => {
    const order = { morning: 0, afternoon: 1, evening: 2 };
    const aOrder = order[a.time_slot as keyof typeof order] ?? 3;
    const bOrder = order[b.time_slot as keyof typeof order] ?? 3;
    return aOrder - bOrder;
  });

  return (
    <div className="bg-card border rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">
            {format(selectedDate, 'EEEE')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <Button onClick={onAddPost} className="w-full mb-4">
        Schedule New Post
      </Button>

      {posts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No posts scheduled for this day
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-3">
            {sortedPosts.map(post => (
              <div
                key={post.id}
                className={cn(
                  "border rounded-lg p-3 space-y-2",
                  post.status === 'posted' && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className={cn(
                    "font-medium text-sm leading-snug",
                    post.status === 'posted' && "line-through"
                  )}>
                    {post.title}
                  </h4>
                  <Badge 
                    variant="secondary" 
                    className={cn("shrink-0 text-xs", STATUS_STYLES[post.status as keyof typeof STATUS_STYLES])}
                  >
                    {post.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {getTimeSlotLabel(post.time_slot)}
                  </div>
                  {post.post_type && (
                    <Badge variant="outline" className="text-xs">
                      {getPostTypeLabel(post.post_type)}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {post.content}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCopy(post)}
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  
                  {post.status !== 'posted' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onMarkPosted(post.id)}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Posted
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onEditPost(post)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => onDeletePost(post.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
