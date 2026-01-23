import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScheduledPost } from '@/types/postIdea';
import { cn } from '@/lib/utils';

interface CalendarGridProps {
  posts: ScheduledPost[];
  onDayClick: (date: Date, posts: ScheduledPost[]) => void;
  onPostClick: (post: ScheduledPost) => void;
  onPostDrop: (postId: string, newDate: Date) => void;
}

const STATUS_DOT_COLORS = {
  planned: 'bg-blue-500',
  posted: 'bg-green-500',
  skipped: 'bg-muted-foreground',
};

export function CalendarGrid({ posts, onDayClick, onPostClick, onPostDrop }: CalendarGridProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const getPostsForDay = (date: Date) => {
    return posts.filter(post => isSameDay(new Date(post.scheduled_date), date));
  };

  const handleDragStart = (e: React.DragEvent, postId: string) => {
    setDraggedPostId(postId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (draggedPostId) {
      onPostDrop(draggedPostId, date);
      setDraggedPostId(null);
    }
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-card rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const dayPosts = getPostsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const hasPlannedPosts = dayPosts.some(p => p.status === 'planned');
          const hasPostedPosts = dayPosts.some(p => p.status === 'posted');
          
          return (
            <div
              key={index}
              className={cn(
                "min-h-[100px] border-b border-r p-1.5 cursor-pointer transition-colors",
                !isCurrentMonth && "bg-muted/30",
                isToday(day) && "bg-primary/5",
                dayPosts.length > 0 && "bg-accent/20",
                "hover:bg-accent/50"
              )}
              onClick={() => onDayClick(day, dayPosts)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={cn(
                  "text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full",
                  !isCurrentMonth && "text-muted-foreground",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}>
                  {format(day, 'd')}
                </div>
                {/* Status dots indicator */}
                {dayPosts.length > 0 && (
                  <div className="flex gap-0.5">
                    {hasPlannedPosts && (
                      <div className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLORS.planned)} />
                    )}
                    {hasPostedPosts && (
                      <div className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLORS.posted)} />
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 2).map(post => (
                  <div
                    key={post.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, post.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPostClick(post);
                    }}
                    className={cn(
                      "text-xs p-1 rounded truncate cursor-grab active:cursor-grabbing border",
                      post.status === 'planned' && "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
                      post.status === 'posted' && "bg-green-50 border-green-200 text-green-900 opacity-60 line-through dark:bg-green-950 dark:border-green-800 dark:text-green-100",
                      post.status === 'skipped' && "bg-muted border-border text-muted-foreground opacity-50"
                    )}
                    title={post.title}
                  >
                    {post.title}
                  </div>
                ))}
                {dayPosts.length > 2 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{dayPosts.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
