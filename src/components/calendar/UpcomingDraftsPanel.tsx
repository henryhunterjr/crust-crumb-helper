import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Clock, Edit, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScheduledPostSlot } from '@/hooks/useCalendarPosts';
import { cn } from '@/lib/utils';

interface Props {
  posts: ScheduledPostSlot[];
  onEdit: (post: ScheduledPostSlot) => void;
  onCopyAndOpen: (post: ScheduledPostSlot) => void;
  now?: Date;
}

function combine(dateStr: string, timeStr: string | null): Date {
  const [h = '0', m = '0'] = (timeStr || '00:00').split(':');
  const d = parseISO(dateStr);
  d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  return d;
}

function countdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms < 0) {
    const overdue = Math.abs(ms);
    const hrs = Math.floor(overdue / 3_600_000);
    if (hrs < 24) return `${hrs}h overdue`;
    return `${Math.floor(hrs / 24)}d overdue`;
  }
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.floor(hrs / 24);
  return `in ${days}d ${hrs % 24}h`;
}

const PLATFORM_ICON: Record<string, string> = { skool: '🏫', instagram: '📸', tiktok: '🎵' };

export function UpcomingDraftsPanel({ posts, onEdit, onCopyAndOpen, now = new Date() }: Props) {
  const upcoming = useMemo(() => {
    return posts
      .filter(p => p.status !== 'posted')
      .map(p => ({ post: p, when: combine(p.scheduled_date, p.time_slot) }))
      .sort((a, b) => a.when.getTime() - b.when.getTime())
      .slice(0, 8);
  }, [posts]);

  if (upcoming.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Drafts</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">No scheduled drafts. Use "+ Custom Post" to add one.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Upcoming Drafts
          <Badge variant="secondary" className="ml-1 text-[10px]">{upcoming.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.map(({ post, when }) => {
          const isOverdue = when.getTime() < now.getTime();
          return (
            <div
              key={post.id}
              className={cn(
                'flex items-center justify-between gap-3 rounded-md border p-2 text-sm',
                isOverdue && 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{PLATFORM_ICON[post.platform || 'skool']}</span>
                  <span className="font-medium truncate">{post.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(when, 'EEE, MMM d · HH:mm')}</span>
                  <Badge variant={isOverdue ? 'destructive' : 'outline'} className="text-[10px] h-4">
                    Next: {countdown(when, now)}
                  </Badge>
                  {post.content_pillar && <span className="text-[10px]">· {post.content_pillar}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(post)}>
                  <Edit className="h-3 w-3 mr-1" />Edit
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onCopyAndOpen(post)}>
                  <ExternalLink className="h-3 w-3 mr-1" />Copy & Post
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}