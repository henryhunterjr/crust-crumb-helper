import { ClassroomResource } from '@/types/classroomResource';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, ExternalLink, Link, Link2Off } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ResourceCardProps {
  resource: ClassroomResource;
  onEdit: (resource: ClassroomResource) => void;
  onDelete: (resource: ClassroomResource) => void;
}

const skillLevelColors: Record<string, string> = {
  beginner: 'bg-primary/20 text-primary border-primary/30',
  intermediate: 'bg-accent/20 text-accent-foreground border-accent/30',
  advanced: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function ResourceCard({ resource, onEdit, onDelete }: ResourceCardProps) {
  const hasUrl = Boolean(resource.url && resource.url.trim());

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-medium text-foreground truncate">{resource.title}</h3>
              
              {/* URL Status Indicator */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {hasUrl ? (
                      <a
                        href={resource.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors"
                      >
                        <Link className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-destructive/70">
                        <Link2Off className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {hasUrl ? 'URL configured — click to open' : 'Missing URL — DMs will mention title only'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {resource.category}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs capitalize ${skillLevelColors[resource.skill_level] || ''}`}
              >
                {resource.skill_level}
              </Badge>
            </div>

            {resource.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {resource.description}
              </p>
            )}

            {resource.keywords && resource.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {resource.keywords.map((keyword, index) => (
                  <span 
                    key={index}
                    className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(resource)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(resource)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
