import { useState, useEffect } from 'react';
import { Copy, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Member } from '@/types/member';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkDMQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onMarkSent: (memberId: string) => void;
}

interface QueueItem {
  member: Member;
  message: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  copied: boolean;
}

export function BulkDMQueueDialog({
  open,
  onOpenChange,
  members,
  onMarkSent,
}: BulkDMQueueDialogProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (open && members.length > 0) {
      setQueue(members.map(m => ({
        member: m,
        message: null,
        status: 'pending',
        copied: false,
      })));
      setCurrentIndex(0);
    }
  }, [open, members]);

  useEffect(() => {
    if (!open || queue.length === 0) return;
    
    const generateNext = async () => {
      const pendingIndex = queue.findIndex(q => q.status === 'pending');
      if (pendingIndex === -1) return;

      setQueue(prev => prev.map((q, i) => 
        i === pendingIndex ? { ...q, status: 'generating' } : q
      ));

      try {
        const { data, error } = await supabase.functions.invoke('generate-dm', {
          body: { member: queue[pendingIndex].member }
        });

        if (error) throw error;

        setQueue(prev => prev.map((q, i) => 
          i === pendingIndex ? { ...q, status: 'done', message: data.message } : q
        ));
      } catch (err) {
        console.error('Error generating DM:', err);
        setQueue(prev => prev.map((q, i) => 
          i === pendingIndex ? { ...q, status: 'error', message: 'Failed to generate' } : q
        ));
      }
    };

    const timer = setTimeout(generateNext, 500);
    return () => clearTimeout(timer);
  }, [queue, open]);

  const handleCopy = async (index: number) => {
    const item = queue[index];
    if (!item.message) return;

    try {
      await navigator.clipboard.writeText(item.message);
      setQueue(prev => prev.map((q, i) => 
        i === index ? { ...q, copied: true } : q
      ));
      toast.success('Message copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAndOpen = async (index: number) => {
    await handleCopy(index);
    window.open('https://www.skool.com/crust-crumb-academy-7621/members', '_blank');
  };

  const handleMarkSent = (index: number) => {
    const item = queue[index];
    onMarkSent(item.member.id);
    setQueue(prev => prev.map((q, i) => 
      i === index ? { ...q, copied: true } : q
    ));
  };

  const completedCount = queue.filter(q => q.status === 'done').length;
  const isAllDone = completedCount === queue.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bulk DM Generation
            <Badge variant="outline">
              {completedCount}/{queue.length} complete
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {queue.map((item, index) => (
              <div 
                key={item.member.id}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.member.skool_name}</span>
                  <Badge 
                    variant={
                      item.status === 'done' ? 'default' :
                      item.status === 'generating' ? 'secondary' :
                      item.status === 'error' ? 'destructive' : 'outline'
                    }
                  >
                    {item.status === 'generating' && (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    {item.status}
                  </Badge>
                </div>

                {item.message && (
                  <div className="bg-muted/50 rounded-md p-3 text-sm mb-3">
                    {item.message}
                  </div>
                )}

                {item.status === 'done' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(index)}
                    >
                      {item.copied ? (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyAndOpen(index)}
                    >
                      Copy & Open Skool
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMarkSent(index)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Sent
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAllDone ? 'Done' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
