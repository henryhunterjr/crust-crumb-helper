import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Copy, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { POST_TYPES, TIME_SLOTS, ScheduledPost } from '@/types/postIdea';
import { toast } from 'sonner';

interface SchedulePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  existingPost?: ScheduledPost | null;
  onSave: (post: {
    title: string;
    content: string;
    scheduled_date: string;
    time_slot?: string;
    post_type?: string;
  }) => void;
  onUpdate?: (id: string, updates: Partial<ScheduledPost>) => void;
  onDelete?: (id: string) => void;
  onMarkPosted?: (id: string) => void;
}

export function SchedulePostDialog({
  open,
  onOpenChange,
  selectedDate,
  existingPost,
  onSave,
  onUpdate,
  onDelete,
  onMarkPosted,
}: SchedulePostDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [postType, setPostType] = useState<string>('');

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setContent(existingPost.content);
      setTimeSlot(existingPost.time_slot || '');
      setPostType(existingPost.post_type || '');
    } else {
      setTitle('');
      setContent('');
      setTimeSlot('');
      setPostType('');
    }
  }, [existingPost, open]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    if (existingPost && onUpdate) {
      onUpdate(existingPost.id, {
        title,
        content,
        time_slot: timeSlot || null,
        post_type: postType || null,
      });
    } else if (selectedDate) {
      onSave({
        title,
        content,
        scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
        time_slot: timeSlot || undefined,
        post_type: postType || undefined,
      });
    }
    onOpenChange(false);
  };

  const handleCopy = async () => {
    const fullPost = `${title}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handlePostNow = () => {
    handleCopy();
    window.open('https://www.skool.com', '_blank');
    if (existingPost && onMarkPosted) {
      onMarkPosted(existingPost.id);
    }
  };

  const handleDelete = () => {
    if (existingPost && onDelete) {
      onDelete(existingPost.id);
      onOpenChange(false);
    }
  };

  const isEditing = !!existingPost;
  const displayDate = existingPost 
    ? new Date(existingPost.scheduled_date) 
    : selectedDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditing ? 'Edit Scheduled Post' : 'Schedule New Post'}
          </DialogTitle>
          {displayDate && (
            <DialogDescription>
              {format(displayDate, 'EEEE, MMMM d, yyyy')}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title with emoji 🍞"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="min-h-[150px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Time Slot</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time">
                    {timeSlot && (
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {TIME_SLOTS.find(t => t.value === timeSlot)?.label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(slot => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Post Type</Label>
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEditing && (
            <>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePostNow}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Post Now
              </Button>
            </>
          )}
          <Button onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Schedule Post'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
