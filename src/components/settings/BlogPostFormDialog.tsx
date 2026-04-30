import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BlogPost, BlogPostInsert, BLOG_CATEGORIES, BLOG_SKILL_LEVELS } from '@/types/blogPost';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: BlogPost | null;
  onSubmit: (data: BlogPostInsert) => void;
  isLoading?: boolean;
}

export function BlogPostFormDialog({ open, onOpenChange, post, onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postUrl, setPostUrl] = useState('');
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0]);
  const [skillLevel, setSkillLevel] = useState<string>(BLOG_SKILL_LEVELS[0]);
  const [keywords, setKeywords] = useState('');
  const [author, setAuthor] = useState('');
  const [readingTime, setReadingTime] = useState('');
  const [publishedAt, setPublishedAt] = useState('');

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setDescription(post.description || '');
      setPostUrl(post.post_url || '');
      setCategory(post.category || BLOG_CATEGORIES[0]);
      setSkillLevel(post.skill_level);
      setKeywords(post.keywords?.join(', ') || '');
      setAuthor(post.author || '');
      setReadingTime(post.reading_time || '');
      setPublishedAt(post.published_at || '');
    } else {
      setTitle(''); setDescription(''); setPostUrl('');
      setCategory(BLOG_CATEGORIES[0]); setSkillLevel(BLOG_SKILL_LEVELS[0]);
      setKeywords(''); setAuthor(''); setReadingTime(''); setPublishedAt('');
    }
  }, [post, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywordArray = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    onSubmit({
      title,
      description: description || null,
      post_url: postUrl || null,
      category: category || null,
      skill_level: skillLevel,
      keywords: keywordArray.length ? keywordArray : null,
      author: author || null,
      reading_time: readingTime || null,
      published_at: publishedAt || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Edit Blog Post' : 'Add Blog Post'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description / Summary</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What the post covers" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post_url">Post URL</Label>
            <Input id="post_url" type="url" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://bakinggreatbread.blog/..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOG_CATEGORIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOG_SKILL_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Henry Hunter" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading_time">Reading time</Label>
              <Input id="reading_time" value={readingTime} onChange={(e) => setReadingTime(e.target.value)} placeholder="6 min" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="published_at">Published</Label>
            <Input id="published_at" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="starter, hydration, troubleshooting" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!title || isLoading}>{isLoading ? 'Saving...' : post ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
