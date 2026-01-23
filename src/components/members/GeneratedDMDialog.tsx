import { useState } from 'react';
import { Copy, ExternalLink, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Member } from '@/types/member';
import { toast } from 'sonner';

interface GeneratedDMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  message: string;
  isGenerating: boolean;
  onRegenerate: () => void;
  onMarkSent: () => void;
}

export function GeneratedDMDialog({
  open,
  onOpenChange,
  member,
  message,
  isGenerating,
  onRegenerate,
  onMarkSent,
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

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>DM for {member.skool_name}</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Generating personalized message...</span>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
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
