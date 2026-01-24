import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, CheckCircle, Loader2, BookOpen, ChefHat, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Member, OutreachType } from '@/types/member';
import { toast } from 'sonner';

interface GeneratedDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  message: string;
  isGenerating: boolean;
  onRegenerate: (outreachType: OutreachType) => void;
  onMarkSent: () => void;
  matchedResources?: string[];
  matchedRecipes?: string[];
  outreachType: OutreachType;
  onOutreachTypeChange: (type: OutreachType) => void;
}

export function GeneratedDMDialog({
  open,
  onOpenChange,
  member,
  message,
  isGenerating,
  onRegenerate,
  onMarkSent,
  matchedResources = [],
  matchedRecipes = [],
  outreachType,
  onOutreachTypeChange,
}: GeneratedDMDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.open('https://www.skool.com/crust-crumb-academy-7621/members', '_blank');
      toast.success('Message copied! Find the member in Skool to send.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy message');
    }
  };

  const handleMarkSent = () => {
    onMarkSent();
    onOpenChange(false);
  };

  const handleTypeChange = (type: string) => {
    const newType = type as OutreachType;
    onOutreachTypeChange(newType);
    onRegenerate(newType);
  };

  if (!member) return null;

  const hasResources = matchedResources.length > 0 || matchedRecipes.length > 0;
  const isFeedbackRequest = outreachType === 'feedback_request';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>DM for {member.skool_name}</DialogTitle>
        </DialogHeader>

        {/* Outreach Type Toggle */}
        <Tabs value={outreachType} onValueChange={handleTypeChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="resource_recommendation" className="text-xs">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Resource Recommendation
            </TabsTrigger>
            <TabsTrigger value="feedback_request" className="text-xs">
              <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
              Feedback Request
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-2">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                Generating {isFeedbackRequest ? 'feedback request' : 'personalized message'}...
              </span>
            </div>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Resources Used Indicator - only for resource recommendations */}
              {!isFeedbackRequest && hasResources && (
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Resources matched for this member:</p>
                  
                  {matchedResources.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-foreground">Classroom Resources</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {matchedResources.slice(0, 3).map((resource, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {resource}
                          </Badge>
                        ))}
                        {matchedResources.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{matchedResources.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {matchedRecipes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <ChefHat className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-foreground">Recipes</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {matchedRecipes.slice(0, 3).map((recipe, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {recipe}
                          </Badge>
                        ))}
                        {matchedRecipes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{matchedRecipes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback request indicator */}
              {isFeedbackRequest && (
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Feedback Request</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This message asks for feedback rather than recommending resources.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(outreachType)}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyAndOpen}
            disabled={isGenerating || !message}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            Copy & Open Skool DMs
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>

          <Button
            size="sm"
            onClick={handleMarkSent}
            disabled={isGenerating || !message}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Sent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
