import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, CheckCircle, Loader2, BookOpen, ChefHat, MessageCircle, Sparkles, Pencil } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Member, OutreachType } from '@/types/member';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GeneratedDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  message: string;
  isGenerating: boolean;
  onRegenerate: (outreachType: OutreachType, customTopic?: string) => void;
  onMarkSent: () => void;
  matchedResources?: string[];
  matchedRecipes?: string[];
  outreachType: OutreachType;
  onOutreachTypeChange: (type: OutreachType) => void;
  customTopic?: string;
  onCustomTopicChange?: (topic: string) => void;
}

const outreachOptions: { value: OutreachType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'welcome_message',
    label: 'Welcome',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Welcome new members',
  },
  {
    value: 'resource_recommendation',
    label: 'Resources',
    icon: <BookOpen className="h-4 w-4" />,
    description: 'Suggest lessons & recipes',
  },
  {
    value: 'feedback_request',
    label: 'Feedback',
    icon: <MessageCircle className="h-4 w-4" />,
    description: 'Ask how to help',
  },
  {
    value: 'custom',
    label: 'Custom',
    icon: <Pencil className="h-4 w-4" />,
    description: 'Your own topic',
  },
];

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
  customTopic = '',
  onCustomTopicChange,
}: GeneratedDMDialogProps) {
  const [copied, setCopied] = useState(false);
  const [localCustomTopic, setLocalCustomTopic] = useState(customTopic);

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

  const handleTypeChange = (type: OutreachType) => {
    onOutreachTypeChange(type);
    if (type !== 'custom') {
      onRegenerate(type);
    }
  };

  const handleGenerateCustom = () => {
    if (!localCustomTopic.trim()) {
      toast.error('Please enter a topic for the custom DM');
      return;
    }
    onCustomTopicChange?.(localCustomTopic);
    onRegenerate('custom', localCustomTopic);
  };

  const handleRegenerate = () => {
    if (outreachType === 'custom') {
      handleGenerateCustom();
    } else {
      onRegenerate(outreachType);
    }
  };

  if (!member) return null;

  const hasResources = matchedResources.length > 0 || matchedRecipes.length > 0;
  const showResources = outreachType === 'resource_recommendation' || outreachType === 'welcome_message';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>DM for {member.skool_name}</DialogTitle>
        </DialogHeader>

        {/* Outreach Type Selection */}
        <div className="grid grid-cols-2 gap-2">
          {outreachOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTypeChange(option.value)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                outreachType === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-md",
                outreachType === option.value ? "bg-primary/20" : "bg-muted"
              )}>
                {option.icon}
              </div>
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Topic Input */}
        {outreachType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customTopic">What's this DM about?</Label>
            <div className="flex gap-2">
              <Input
                id="customTopic"
                value={localCustomTopic}
                onChange={(e) => setLocalCustomTopic(e.target.value)}
                placeholder="e.g., Inviting them to Saturday's live bake"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustom()}
              />
              <Button 
                onClick={handleGenerateCustom} 
                disabled={isGenerating || !localCustomTopic.trim()}
                size="sm"
              >
                Generate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Examples: "Checking if they're ready for the baking challenge", "Following up on a question"
            </p>
          </div>
        )}

        <div className="mt-2">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                Generating personalized message...
              </span>
            </div>
          ) : message ? (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message}
                </p>
              </div>

              {/* Resources Used Indicator - for resource-based types */}
              {showResources && hasResources && (
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
              {outreachType === 'feedback_request' && (
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Feedback Request</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Asking how to better serve them.
                  </p>
                </div>
              )}

              {/* Custom topic indicator */}
              {outreachType === 'custom' && localCustomTopic && (
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Custom Topic</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {localCustomTopic}
                  </p>
                </div>
              )}

              {/* Welcome message indicator */}
              {outreachType === 'welcome_message' && !hasResources && (
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">Welcome Message</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Welcoming them to the community.
                  </p>
                </div>
              )}
            </>
          ) : outreachType === 'custom' ? (
            <div className="text-center py-8 text-muted-foreground">
              Enter a topic above and click Generate to create a custom DM.
            </div>
          ) : null}
        </div>

        {message && (
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
