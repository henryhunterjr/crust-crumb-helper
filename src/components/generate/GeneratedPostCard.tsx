import { Copy, Save, Check, CalendarPlus, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSkoolCommunityUrl } from '@/lib/skoolLinks';

interface GeneratedPostCardProps {
  title: string;
  content: string;
  onSave: () => void;
  onSchedule?: () => void;
  isSaving?: boolean;
}

export function GeneratedPostCard({ title, content, onSave, onSchedule, isSaving }: GeneratedPostCardProps) {
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const handleCopy = async () => {
    const fullPost = `${title}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAndOpen = async () => {
    // window.open MUST be first to avoid pop-up blockers.
    const win = window.open(getSkoolCommunityUrl(), '_blank', 'noopener');
    setSending(true);
    const fullPost = `${title}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      toast.success('Copied — paste into the New Post box in Skool');
    } catch {
      toast.error('Opened Skool, but copy failed. Use Copy and try again.');
    } finally {
      setSending(false);
      if (!win) toast.error('Pop-up blocked — allow pop-ups for this site');
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">
          {content}
        </p>
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleCopyAndOpen}
            disabled={sending}
          >
            <Send className="h-4 w-4 mr-2" />
            Copy & Open Skool
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
          {onSchedule && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onSchedule}
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Schedule to Calendar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
