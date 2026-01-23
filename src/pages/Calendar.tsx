import { useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { Header } from '@/components/Header';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { DayDetailPanel } from '@/components/calendar/DayDetailPanel';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';
import { useScheduledPosts } from '@/hooks/useScheduledPosts';
import { ScheduledPost } from '@/types/postIdea';

export default function Calendar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showDayPanel, setShowDayPanel] = useState(false);

  const {
    scheduledPosts,
    createScheduledPost,
    updateScheduledPost,
    reschedulePost,
    deleteScheduledPost,
    markAsPosted,
  } = useScheduledPosts();

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedPost(null);
    setShowDayPanel(true);
  };

  const handlePostClick = (post: ScheduledPost) => {
    setSelectedPost(post);
    setSelectedDate(new Date(post.scheduled_date));
    setDialogOpen(true);
  };

  const handlePostDrop = (postId: string, newDate: Date) => {
    reschedulePost.mutate({
      id: postId,
      scheduled_date: format(newDate, 'yyyy-MM-dd'),
    });
  };

  const handleAddPost = () => {
    setSelectedPost(null);
    setDialogOpen(true);
  };

  const handleSave = (post: {
    title: string;
    content: string;
    scheduled_date: string;
    time_slot?: string;
    post_type?: string;
  }) => {
    createScheduledPost.mutate(post);
  };

  const handleUpdate = (id: string, updates: Partial<ScheduledPost>) => {
    updateScheduledPost.mutate({ id, ...updates });
  };

  const handleDelete = (id: string) => {
    deleteScheduledPost.mutate(id);
  };

  const handleMarkPosted = (id: string) => {
    markAsPosted.mutate(id);
  };

  const postsForSelectedDay = selectedDate
    ? scheduledPosts.filter(post => isSameDay(new Date(post.scheduled_date), selectedDate))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Content Calendar
          </h1>
          <p className="text-muted-foreground">
            Plan and schedule your community posts. Drag posts to reschedule.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_350px] gap-6">
          <CalendarGrid
            posts={scheduledPosts}
            onDayClick={handleDayClick}
            onPostClick={handlePostClick}
            onPostDrop={handlePostDrop}
          />

          {showDayPanel && selectedDate && (
            <DayDetailPanel
              selectedDate={selectedDate}
              posts={postsForSelectedDay}
              onAddPost={handleAddPost}
              onEditPost={handlePostClick}
              onDeletePost={handleDelete}
              onMarkPosted={handleMarkPosted}
              onClose={() => setShowDayPanel(false)}
            />
          )}
        </div>

        <SchedulePostDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedDate={selectedDate}
          existingPost={selectedPost}
          onSave={handleSave}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onMarkPosted={handleMarkPosted}
        />
      </main>
    </div>
  );
}
