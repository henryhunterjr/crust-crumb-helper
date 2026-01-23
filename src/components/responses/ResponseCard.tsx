import { Copy, Edit, Trash2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickResponse } from "@/types/quickResponse";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ResponseCardProps {
  response: QuickResponse;
  onEdit: (response: QuickResponse) => void;
  onDelete: (id: string) => void;
  onCopy: (id: string, content: string) => void;
}

export function ResponseCard({ response, onEdit, onDelete, onCopy }: ResponseCardProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.content);
      onCopy(response.id, response.content);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const previewContent = response.content.length > 150 
    ? response.content.substring(0, 150) + "..." 
    : response.content;

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground leading-tight mb-2 line-clamp-2">
              {response.title}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {response.category}
            </Badge>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(response)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(response.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">
          {previewContent}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {response.use_count > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Used {response.use_count}x
              </span>
            )}
            {response.last_used_at && (
              <span>
                · {formatDistanceToNow(new Date(response.last_used_at), { addSuffix: true })}
              </span>
            )}
          </div>
          
          <Button onClick={handleCopy} size="sm" className="gap-2">
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
