import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PLATFORMS, CONTENT_PILLARS, FRAMEWORKS, POST_TYPES } from '@/types/postIdea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onSave: (post: {
    title: string;
    content: string;
    scheduled_date: string;
    time_slot: string;
    platform: string;
    post_type?: string;
    content_pillar?: string | null;
    framework?: string | null;
    caption?: string | null;
    hashtags?: string | null;
    source_material?: string | null;
  }) => void;
  isSaving?: boolean;
}

export function CustomPostDialog({ open, onOpenChange, onSave, isSaving }: Props) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('12:00');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('skool');
  const [postType, setPostType] = useState('');
  const [pillar, setPillar] = useState('');
  const [framework, setFramework] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (open) {
      setDate(new Date());
      setTime('12:00');
      setTitle(''); setContent(''); setPlatform('skool');
      setPostType(''); setPillar(''); setFramework('');
      setCaption(''); setHashtags(''); setSource('');
    }
  }, [open]);

  const handleSave = () => {
    if (!date) { toast.error('Pick a date'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    onSave({
      title: title.trim(),
      content,
      scheduled_date: format(date, 'yyyy-MM-dd'),
      time_slot: time,
      platform,
      post_type: postType || undefined,
      content_pillar: pillar || null,
      framework: framework || null,
      caption: caption || null,
      hashtags: hashtags || null,
      source_material: source || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Schedule Custom Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date + time row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'EEE, MMM d, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time (24h)</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} step={60} />
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Post Type</Label>
              <Select value={postType || 'none'} onValueChange={(v) => setPostType(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {POST_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content Pillar</Label>
              <Select value={pillar || 'none'} onValueChange={(v) => setPillar(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CONTENT_PILLARS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Framework</Label>
              <Select value={framework || 'none'} onValueChange={(v) => setFramework(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {FRAMEWORKS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title with emoji 🍞" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[140px]" placeholder="Write your post content..." />
          </div>

          {platform !== 'skool' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Caption</Label>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[60px] text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hashtags</Label>
                <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#sourdough #breadbaking" className="text-xs" />
              </div>
            </>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Source Material (optional)</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Recipe, course module, blog link" className="text-xs" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Schedule Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}