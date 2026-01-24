import { useState, useEffect } from 'react';
import { ClassroomResource, ClassroomResourceInsert, RESOURCE_CATEGORIES, SKILL_LEVELS } from '@/types/classroomResource';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: ClassroomResource | null;
  onSubmit: (data: ClassroomResourceInsert) => void;
  isLoading?: boolean;
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
  isLoading,
}: ResourceFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(RESOURCE_CATEGORIES[0]);
  const [skillLevel, setSkillLevel] = useState<string>('beginner');
  const [keywords, setKeywords] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setDescription(resource.description || '');
      setCategory(resource.category);
      setSkillLevel(resource.skill_level);
      setKeywords(resource.keywords?.join(', ') || '');
      setUrl(resource.url || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory(RESOURCE_CATEGORIES[0]);
      setSkillLevel('beginner');
      setKeywords('');
      setUrl('');
    }
  }, [resource, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const keywordArray = keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    onSubmit({
      title,
      description: description || null,
      category,
      skill_level: skillLevel,
      keywords: keywordArray.length > 0 ? keywordArray : null,
      url: url || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          <DialogDescription>
            {resource 
              ? 'Update the classroom resource details.' 
              : 'Add a new classroom resource for AI recommendations.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Getting Started with Sourdough"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What members will learn from this resource..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillLevel">Skill Level</Label>
              <Select value={skillLevel} onValueChange={setSkillLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g., starter, feeding, maintenance, bubbles"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.skool.com/crust-crumb-academy-7621/classroom/..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title || !category || isLoading}>
              {isLoading ? 'Saving...' : resource ? 'Update' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
