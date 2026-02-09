import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOutreachMessages } from '@/hooks/useOutreachMessages';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  welcome_message: 'Welcome',
  resource_recommendation: 'Resources',
  feedback_request: 'Feedback',
  custom: 'Custom',
};

const statusStyles: Record<string, string> = {
  generated: 'bg-accent text-accent-foreground',
  sent: 'bg-primary/15 text-primary border-primary/30',
  replied: 'bg-[hsl(142,76%,36%)]/15 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30',
};

interface MemberMessageHistoryProps {
  memberId: string;
}

export function MemberMessageHistory({ memberId }: MemberMessageHistoryProps) {
  const { messages, isLoading } = useOutreachMessages(memberId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading history...</p>;
  }

  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No messages generated yet</p>;
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Message copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {messages.map((msg) => (
        <div key={msg.id} className="border rounded-md p-3 text-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {typeLabels[msg.message_type] || msg.message_type}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusStyles[msg.status] || ''}`}>
                {msg.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(msg.created_at), 'MMM d, h:mm a')}
            </span>
          </div>

          <p className={`text-muted-foreground ${expandedId === msg.id ? '' : 'line-clamp-2'}`}>
            {msg.message_text}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
            >
              {expandedId === msg.id ? (
                <><ChevronUp className="h-3 w-3 mr-1" /> Collapse</>
              ) : (
                <><ChevronDown className="h-3 w-3 mr-1" /> Expand</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleCopy(msg.message_text)}
            >
              <Copy className="h-3 w-3 mr-1" /> Copy
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
