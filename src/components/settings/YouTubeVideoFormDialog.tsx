import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YouTubeVideo, YouTubeVideoInsert, YOUTUBE_SERIES, YOUTUBE_SKILL_LEVELS } from '@/types/youtubeVideo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: YouTubeVideo | null;
  onSubmit: (data: YouTubeVideoInsert) => void;
  isLoading?: boolean;
}

export function YouTubeVideoFormDialog({ open, onOpenChange, video, onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [series, setSeries] = useState<string>(YOUTUBE_SERIES[0]);
  const [skillLevel, setSkillLevel] = useState<string>(YOUTUBE_SKILL_LEVELS[0]);
  const [keywords, setKeywords] = useState('');
  const [duration, setDuration] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || '');
      setVideoUrl(video.video_url || '');
      setThumbnailUrl(video.thumbnail_url || '');
      setSeries(video.series || YOUTUBE_SERIES[0]);
      setSkillLevel(video.skill_level);
      setKeywords(video.keywords?.join(', ') || '');
      setDuration(video.duration || '');
      setPublishedAt(video.published_at || '');
    } else {
      setTitle(''); setDescription(''); setVideoUrl(''); setThumbnailUrl('');
      setSeries(YOUTUBE_SERIES[0]); setSkillLevel(YOUTUBE_SKILL_LEVELS[0]);
      setKeywords(''); setDuration(''); setPublishedAt('');
    }
  }, [video, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    onSubmit({
      title,
      description: description || null,
      video_url: videoUrl || null,
      thumbnail_url: thumbnailUrl || null,
      series: series || null,
      skill_level: skillLevel,
      keywords: keywordArray.length ? keywordArray : null,
      duration: duration || null,
      published_at: publishedAt || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video ? 'Edit YouTube Video' : 'Add YouTube Video'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What the video covers" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="video_url">Video URL</Label>
            <Input id="video_url" type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Series / Playlist</Label>
              <Select value={series} onValueChange={setSeries}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YOUTUBE_SERIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YOUTUBE_SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input id="duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="12:34" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="published_at">Published</Label>
              <Input id="published_at" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="starter, feeding, troubleshooting" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
            <Input id="thumbnail_url" type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title || isLoading}>{isLoading ? 'Saving...' : video ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}