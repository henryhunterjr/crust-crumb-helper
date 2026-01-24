import { Edit, Trash2, Sparkles, BookOpen, MessageCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DMTemplate } from '@/types/dmTemplate';
import { OutreachType } from '@/types/member';

interface DMTemplateCardProps {
  template: DMTemplate;
  onEdit: () => void;
  onDelete: () => void;
}

const outreachTypeLabels: Record<OutreachType, { label: string; icon: React.ReactNode }> = {
  welcome_message: { label: 'Welcome', icon: <Sparkles className="h-3 w-3" /> },
  resource_recommendation: { label: 'Resources', icon: <BookOpen className="h-3 w-3" /> },
  feedback_request: { label: 'Feedback', icon: <MessageCircle className="h-3 w-3" /> },
  custom: { label: 'Custom', icon: <Pencil className="h-3 w-3" /> },
};

export function DMTemplateCard({ template, onEdit, onDelete }: DMTemplateCardProps) {
  const typeInfo = outreachTypeLabels[template.outreach_type] || outreachTypeLabels.custom;

  return (
    <div className="p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {template.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-muted/50 rounded p-2 mb-3">
        <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
          {template.content}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="text-xs gap-1">
          {typeInfo.icon}
          {typeInfo.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Used {template.use_count} time{template.use_count !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
