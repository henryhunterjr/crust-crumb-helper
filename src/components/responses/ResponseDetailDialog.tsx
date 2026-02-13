import { Copy, Edit, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QuickResponse } from "@/types/quickResponse";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ResponseTopicTags } from "./ResponseTopicTags";

interface ResponseDetailDialogProps {
  response: QuickResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (response: QuickResponse) => void;
  onCopy: (id: string, content: string) => void;
}

export function ResponseDetailDialog({
  response,
  open,
  onOpenChange,
  onEdit,
  onCopy,
}: ResponseDetailDialogProps) {
  if (!response) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.content);
      onCopy(response.id, response.content);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl mb-2">{response.title}</DialogTitle>
              <Badge variant="secondary">{response.category}</Badge>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm leading-relaxed">
            {response.content}
          </div>
          
          {response.trigger_phrases.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Search keywords:</p>
              <div className="flex flex-wrap gap-1">
                {response.trigger_phrases.map((phrase) => (
                  <Badge key={phrase} variant="outline" className="text-xs">
                    {phrase}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <ResponseTopicTags
            responseId={response.id}
            topicTags={response.topic_tags || []}
            relatedCourseIds={response.related_course_ids || []}
            relatedRecipeIds={response.related_recipe_ids || []}
            searchHitCount={response.search_hit_count || 0}
          />
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {response.use_count > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Used {response.use_count} times
                </span>
              )}
              {response.last_used_at && (
                <span>
                  · Last used {formatDistanceToNow(new Date(response.last_used_at), { addSuffix: true })}
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => onEdit(response)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button size="sm" className="gap-2" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
