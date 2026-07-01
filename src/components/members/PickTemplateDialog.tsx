import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useDMTemplates } from '@/hooks/useDMTemplates';
import { DMTemplate } from '@/types/dmTemplate';
import { FileText } from 'lucide-react';

interface PickTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberCount: number;
  onPick: (template: DMTemplate) => void;
}

export function PickTemplateDialog({
  open,
  onOpenChange,
  memberCount,
  onPick,
}: PickTemplateDialogProps) {
  const { templates, isLoading } = useDMTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = templates.find((t) => t.id === selectedId) || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Send Exact Template</DialogTitle>
          <DialogDescription>
            Pick a saved template. It will be sent verbatim to {memberCount} member
            {memberCount === 1 ? '' : 's'}, with <code>{'{{first_name}}'}</code> replaced per member.
            No AI paraphrasing.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No templates yet. Create one in Settings → DM Templates.
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-3">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left border rounded-lg p-3 transition-colors ${
                    selectedId === t.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t.outreach_type}
                    </Badge>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mb-1">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.content.slice(0, 160)}
                    {t.content.length > 160 ? '…' : ''}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selected && (
          <div className="border rounded-md p-3 bg-muted/40 text-sm max-h-[200px] overflow-auto whitespace-pre-wrap">
            {selected.content}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (selected) onPick(selected);
            }}
          >
            Queue {memberCount} Send{memberCount === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}