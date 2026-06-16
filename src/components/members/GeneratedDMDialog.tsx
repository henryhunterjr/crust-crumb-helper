import { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, CheckCircle, Loader2, BookOpen, ChefHat, MessageCircle, Sparkles, Pencil, FileText, Save, ChevronDown, ExternalLink, Link, Circle, AlertTriangle } from 'lucide-react';
import { copyAndOpenSkool, sendSkoolDmAuto, copyAndOpenProfileFallback } from '@/lib/skoolLinks';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Member, OutreachType } from '@/types/member';
import { DMTemplate } from '@/types/dmTemplate';
import { useDMTemplates } from '@/hooks/useDMTemplates';
import { useClassroomResources } from '@/hooks/useClassroomResources';
import { useRecipes } from '@/hooks/useRecipes';
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
  const [localMessage, setLocalMessage] = useState(message);
  const [localCustomTopic, setLocalCustomTopic] = useState(customTopic);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Auto-send progress tracking. Steps:
  //   opening → message-button → composer → pasting → sending → done | blocked | timeout
  type AutoStep =
    | 'idle'
    | 'opening'
    | 'searching'
    | 'member-selected'
    | 'message-button'
    | 'composer'
    | 'pasting'
    | 'sending'
    | 'done'
    | 'blocked'
    | 'timeout'
    | 'fallback';
  const [autoStep, setAutoStep] = useState<AutoStep>('idle');
  const [autoError, setAutoError] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  const { templates, createTemplate, incrementUseCount } = useDMTemplates();
  const { resources: allResources } = useClassroomResources();
  const { recipes: allRecipes } = useRecipes();

  const getResourceUrl = (title: string): string | null => {
    const resource = allResources.find(r => r.title === title);
    return resource?.url || null;
  };

  const getRecipeUrl = (title: string): string | null => {
    const recipe = allRecipes.find(r => r.title === title);
    return (recipe as any)?.skool_url || recipe?.url || null;
  };

  const handleInsertLink = (title: string, type: 'resource' | 'recipe') => {
    const url = type === 'resource' ? getResourceUrl(title) : getRecipeUrl(title);
    if (url) {
      setLocalMessage(prev => prev + `\n\n${url}`);
      toast.success(`Link inserted for "${title}"`);
    } else {
      toast.error(`No URL found for "${title}"`);
    }
  };

  const handleCopyResourceUrl = (title: string, type: 'resource' | 'recipe') => {
    const url = type === 'resource' ? getResourceUrl(title) : getRecipeUrl(title);
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success(`Link copied for "${title}"`);
      });
    } else {
      toast.error(`No URL found for "${title}"`);
    }
  };

  useEffect(() => {
    setLocalMessage(message);
  }, [message]);

  useEffect(() => {
    setLocalCustomTopic(customTopic);
  }, [customTopic]);

  // Reset auto-send progress when the dialog closes or message changes.
  useEffect(() => {
    if (!open) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      setAutoStep('idle');
      setAutoError(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const startAutoSend = async () => {
    setAutoError(null);
    setAutoStep('opening');
    // Set up listener BEFORE opening, so we don't miss early events.
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.source !== 'krusty-ext') return;
      switch (data.step) {
        case 'opened':
          // already showing 'opening'; no-op
          break;
        case 'searching-member':
          setAutoStep('searching');
          break;
        case 'member-selected':
          setAutoStep('member-selected');
          break;
        case 'message-button-clicked':
          setAutoStep('message-button');
          break;
        case 'waiting-for-composer':
          setAutoStep((s) => (s === 'message-button' ? 'message-button' : 'composer'));
          break;
        case 'composer-mounted':
          setAutoStep('composer');
          break;
        case 'pasted':
          setAutoStep('pasting');
          window.setTimeout(() => {
            setAutoStep((s) => (s === 'pasting' ? 'sending' : s));
          }, 250);
          break;
        case 'sent':
          setAutoStep('done');
          toast.success('DM sent via Skool');
          break;
        case 'send-blocked':
          setAutoStep('blocked');
          break;
      }
    };
    window.addEventListener('message', onMessage);
    cleanupRef.current = () => window.removeEventListener('message', onMessage);

    const result = await sendSkoolDmAuto(
      localMessage,
      member?.skool_username,
      member?.skool_name,
    );
    if (!result.ok) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (result.reason === 'popup-blocked') {
        setAutoError('Pop-up blocked. Allow pop-ups for this site and try again.');
      } else if (result.reason === 'clipboard-failed') {
        setAutoError('Could not copy the message to your clipboard.');
      } else if (result.reason === 'no-username') {
        setAutoError('Member has no searchable Skool name on file.');
      }
      setAutoStep('idle');
      return;
    }
    // Promote 'opening' → 'sending' eventually; if no events arrive in 12s, time out.
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setAutoStep((s) => {
        if (s === 'done' || s === 'blocked' || s === 'fallback' || s === 'idle') return s;
        setAutoError(
          'No response from the Krusty extension. Make sure it is installed (v1.5+) and the Skool tab is open. The message is already on your clipboard, so you can paste it manually.',
        );
        return 'timeout';
      });
    }, 12000);
  };

  const startFallback = async () => {
    setAutoError(null);
    setAutoStep('fallback');
    const r = await copyAndOpenProfileFallback(
      localMessage,
      member?.skool_username,
      member?.skool_name,
    );
    if (!r.ok) {
      setAutoError('Could not copy the message or open the Members page.');
      setAutoStep('idle');
      return;
    }
    toast.success('Copied. Members page opened in a new tab.');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localMessage);
      setCopied(true);
      toast.success('Message copied!');
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

  // ---- Auto-send stepper ----
  const stepOrder: { key: AutoStep; label: string }[] = [
    { key: 'opening', label: 'Opening Members page' },
    { key: 'searching', label: 'Searching member' },
    { key: 'member-selected', label: 'Opening member chat' },
    { key: 'message-button', label: 'Clicking Message' },
    { key: 'composer', label: 'Waiting for DM composer' },
    { key: 'pasting', label: 'Pasting message' },
    { key: 'sending', label: 'Sending' },
  ];
  const stepIndex = (s: AutoStep) => {
    const i = stepOrder.findIndex((x) => x.key === s);
    if (s === 'done') return stepOrder.length;
    return i;
  };
  const currentIdx = stepIndex(autoStep);
  const autoActive =
    autoStep !== 'idle' &&
    autoStep !== 'fallback' &&
    autoStep !== 'done' &&
    autoStep !== 'blocked' &&
    autoStep !== 'timeout';

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
                  {localMessage}
                </p>
              </div>

              {/* Resources Used Indicator - for resource-based types */}
              {showResources && hasResources && (
                <TooltipProvider>
                <div className="mt-4 p-3 bg-accent/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Resources matched — click badge to copy link, or insert into DM:
                  </p>
                  
                  {matchedResources.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-foreground">Classroom Resources</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedResources.slice(0, 5).map((resource, idx) => {
                          const url = getResourceUrl(resource);
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-xs transition-colors",
                                      url
                                        ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                        : "opacity-60"
                                    )}
                                    onClick={() => handleCopyResourceUrl(resource, 'resource')}
                                  >
                                    {resource}
                                    {url && <ExternalLink className="h-2.5 w-2.5 ml-1" />}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {url ? 'Click to copy link' : 'No URL available'}
                                </TooltipContent>
                              </Tooltip>
                              {url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-sm"
                                      onClick={() => handleInsertLink(resource, 'resource')}
                                    >
                                      <Link className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Insert link into DM</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}
                        {matchedResources.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{matchedResources.length - 5} more
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
                      <div className="flex flex-wrap gap-1.5">
                        {matchedRecipes.slice(0, 5).map((recipe, idx) => {
                          const url = getRecipeUrl(recipe);
                          return (
                            <div key={idx} className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-xs transition-colors",
                                      url
                                        ? "cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                        : "opacity-60"
                                    )}
                                    onClick={() => handleCopyResourceUrl(recipe, 'recipe')}
                                  >
                                    {recipe}
                                    {url && <ExternalLink className="h-2.5 w-2.5 ml-1" />}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {url ? 'Click to copy link' : 'No URL available'}
                                </TooltipContent>
                              </Tooltip>
                              {url && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 rounded-sm"
                                      onClick={() => handleInsertLink(recipe, 'recipe')}
                                    >
                                      <Link className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Insert link into DM</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}
                        {matchedRecipes.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{matchedRecipes.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </TooltipProvider>
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
                onClick={handleCopy}
                disabled={isGenerating || !message}
                aria-label="Copy DM to clipboard"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy DM
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const success = await copyAndOpenSkool(localMessage, member?.skool_username);
                  if (success) {
                    toast.success('Copied! Opening Skool...');
                  } else {
                    toast.error('Failed to copy');
                  }
                }}
                disabled={isGenerating || !message}
                aria-label="Copy message and open Skool chat"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Copy & Open Skool
              </Button>

              <Button
                size="sm"
                onClick={async () => {
                  await startAutoSend();
                }}
                disabled={isGenerating || !message || !(member?.skool_name || member?.skool_username) || autoActive}
                aria-label="Send DM automatically via Krusty extension"
                title={
                  !(member?.skool_name || member?.skool_username)
                    ? 'Member has no searchable Skool name on file'
                    : 'Requires Krusty Chrome extension v1.5+ installed'
                }
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Send via Skool
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={startFallback}
                disabled={isGenerating || !message}
                aria-label="Copy DM and open the Members page (manual send)"
                title="No extension? Copy the message and open the Members page, then search the member and paste."
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Copy & Open Members
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

            {/* Auto-send progress stepper */}
            {(autoStep !== 'idle' || autoError) && (
              <div className="mt-4 p-3 rounded-lg border border-border/60 bg-muted/40">
                {autoStep === 'fallback' ? (
                  <div className="text-sm">
                    <p className="font-medium text-foreground mb-2">Manual send mode</p>
                    <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                      <li>The Skool Members page is open in a new tab.</li>
                      <li>Search for <span className="font-medium text-foreground">{member.skool_name}</span>, then click the member's Message button.</li>
                      <li>Paste with <span className="font-mono">Ctrl/Cmd + V</span> — the DM is already on your clipboard.</li>
                      <li>Press <span className="font-mono">Enter</span> to send.</li>
                    </ol>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {autoStep === 'done'
                        ? 'Done — message delivered.'
                        : autoStep === 'blocked'
                        ? 'Pasted, but Skool blocked auto-send. Press Enter in the Skool tab to finish.'
                        : autoStep === 'timeout'
                        ? 'Stuck — see fallback below.'
                        : 'Auto-send in progress…'}
                    </p>
                    <ol className="space-y-1.5">
                      {stepOrder.map((s, i) => {
                        const done = i < currentIdx || autoStep === 'done';
                        const active = i === currentIdx && autoActive;
                        return (
                          <li key={s.key} className="flex items-center gap-2 text-xs">
                            {done ? (
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            ) : active ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                            )}
                            <span
                              className={cn(
                                done
                                  ? 'text-foreground'
                                  : active
                                  ? 'text-foreground font-medium'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {s.label}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}

                {autoError && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <span>{autoError}</span>
                  </div>
                )}

                {(autoStep === 'timeout' || autoStep === 'blocked') && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={startFallback}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Open Members and paste manually
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
