import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DMTemplate } from '@/types/dmTemplate';
import { OutreachType } from '@/types/member';

interface DMTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DMTemplate | null;
  onSave: (data: {
    name: string;
    content: string;
    outreach_type: OutreachType;
    description?: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export function DMTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isSaving,
}: DMTemplateFormDialogProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [outreachType, setOutreachType] = useState<OutreachType>('custom');
  const [description, setDescription] = useState('');

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setOutreachType(template.outreach_type);
      setDescription(template.description || '');
    } else {
      setName('');
      setContent('');
      setOutreachType('custom');
      setDescription('');
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !content.trim()) return;

    await onSave({
      name: name.trim(),
      content: content.trim(),
      outreach_type: outreachType,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your saved DM template.'
              : 'Save a message pattern for quick reuse.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome new sourdough baker"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="When to use this template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outreachType">Outreach Type</Label>
            <Select value={outreachType} onValueChange={(v) => setOutreachType(v as OutreachType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome_message">Welcome Message</SelectItem>
                <SelectItem value="resource_recommendation">Resource Recommendation</SelectItem>
                <SelectItem value="feedback_request">Feedback Request</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Message Template *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hey {name}! Welcome to Crust & Crumb Academy..."
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use {'{name}'} as a placeholder for the member's first name.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !content.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Update Template'
              ) : (
                'Create Template'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
