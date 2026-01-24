import { useState, useEffect } from 'react';
import { Copy, ExternalLink, RefreshCw, CheckCircle, Loader2, BookOpen, ChefHat, MessageCircle, Sparkles, Pencil, FileText, Save, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Member, OutreachType } from '@/types/member';
import { DMTemplate } from '@/types/dmTemplate';
import { useDMTemplates } from '@/hooks/useDMTemplates';
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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  
  const { templates, createTemplate, incrementUseCount } = useDMTemplates();

  useEffect(() => {
    setLocalCustomTopic(customTopic);
  }, [customTopic]);

  const handleCopyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      
      // Build the Skool URL based on whether we have a username
      if (member?.skool_username) {
        // Direct profile link
        window.open(`https://www.skool.com/@${member.skool_username}?g=crust-crumb-academy-7621`, '_blank');
        toast.success('Message copied! Opening profile...');
      } else {
        // Fallback: search by name
        const nameParts = member?.skool_name.split(' ') || [];
        const searchQuery = nameParts.join('+');
        window.open(`https://www.skool.com/crust-crumb-academy-7621/members?q=${encodeURIComponent(searchQuery)}`, '_blank');
        toast.success(`Searching for ${member?.skool_name} in Skool members...`);
      }
      
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

  const handleUseTemplate = (template: DMTemplate) => {
    if (!member) return;
    
    // Replace {name} placeholder with member's first name
    const firstName = member.skool_name.split(' ')[0];
    const personalizedMessage = template.content.replace(/\{name\}/gi, firstName);
    
    // Copy to clipboard immediately
    navigator.clipboard.writeText(personalizedMessage).then(() => {
      toast.success('Template copied to clipboard!');
      incrementUseCount.mutate(template.id);
    }).catch(() => {
      toast.error('Failed to copy template');
    });
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !message) return;
    
    try {
      // Replace the member's name back with placeholder
      const firstName = member?.skool_name.split(' ')[0] || '';
      const templateContent = message.replace(new RegExp(firstName, 'g'), '{name}');
      
      await createTemplate.mutateAsync({
        name: templateName.trim(),
        content: templateContent,
        outreach_type: outreachType,
      });
      
      toast.success('Template saved!');
      setShowSaveDialog(false);
      setTemplateName('');
    } catch (error) {
      console.error('Save template error:', error);
      toast.error('Failed to save template');
    }
  };

  if (!member) return null;

  const hasResources = matchedResources.length > 0 || matchedRecipes.length > 0;
  const showResources = outreachType === 'resource_recommendation' || outreachType === 'welcome_message';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>DM for {member.skool_name}</span>
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Use a saved template</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {templates.slice(0, 5).map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{template.name}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {template.content.slice(0, 50)}...
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {templates.length > 5 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-muted-foreground text-xs">
                        +{templates.length - 5} more in Settings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogTitle>
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
          <>
            {/* Save as template section */}
            {showSaveDialog ? (
              <div className="flex gap-2 items-center p-3 bg-muted/50 rounded-lg">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAsTemplate()}
                />
                <Button
                  size="sm"
                  onClick={handleSaveAsTemplate}
                  disabled={!templateName.trim() || createTemplate.isPending}
                >
                  {createTemplate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setTemplateName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : null}

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

              {!showSaveDialog && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Template
                </Button>
              )}
              
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
