import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Member, OutreachType } from '@/types/member';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkDMQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onMarkSent: (memberId: string) => void;
  outreachType: OutreachType;
}

interface QueueItem {
  member: Member;
  message: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
  copied: boolean;
  outreachMessageId: string | null;
}

export function BulkDMQueueDialog({
  open,
  onOpenChange,
  members,
  onMarkSent,
  outreachType,
}: BulkDMQueueDialogProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    if (open && members.length > 0) {
      setQueue(members.map(m => ({
        member: m,
        message: null,
        status: 'pending',
        copied: false,
        outreachMessageId: null,
      })));
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

      const member = queue[pendingIndex].member;
      
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-dm', {
            body: { 
              member: {
                id: member.id,
                skool_name: member.skool_name,
                skool_username: member.skool_username,
                application_answer: member.application_answer,
                join_date: member.join_date,
                last_active: member.last_active,
                post_count: member.post_count || 0,
                comment_count: member.comment_count || 0,
              },
              outreach_type: outreachType
            }
          });

          if (error) throw error;
          
          if (!data?.message) {
            throw new Error('No message returned from AI');
          }

          // Save to outreach log
          let savedMessageId: string | null = null;
          try {
            const { data: savedMsg } = await supabase
              .from('outreach_messages')
              .insert({
                member_id: member.id,
                member_name: member.skool_name,
                message_type: outreachType,
                message_text: data.message,
              })
              .select()
              .single();
            
            savedMessageId = savedMsg?.id || null;
            
            // Update member message status
            await supabase
              .from('members')
              .update({ message_status: 'message_generated' })
              .eq('id', member.id);
          } catch (logErr) {
            console.error('Error saving to outreach log:', logErr);
          }

          setQueue(prev => prev.map((q, i) => 
            i === pendingIndex ? { 
              ...q, 
              status: 'done', 
              message: data.message,
              outreachMessageId: savedMessageId,
            } : q
          ));
          return;
        } catch (err) {
          attempts++;
          console.error(`Error generating DM (attempt ${attempts}/${maxAttempts}):`, err);
          
          if (attempts >= maxAttempts) {
            setQueue(prev => prev.map((q, i) => 
              i === pendingIndex ? { ...q, status: 'error', message: 'Failed to generate after retries' } : q
            ));
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          }
        }
      }
    };

    const timer = setTimeout(generateNext, 500);
    return () => clearTimeout(timer);
  }, [queue, open, outreachType]);

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

  const handleMarkSent = async (index: number) => {
    const item = queue[index];
    onMarkSent(item.member.id);
    
    // Update outreach message status
    if (item.outreachMessageId) {
      try {
        await supabase
          .from('outreach_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.outreachMessageId);
      } catch (err) {
        console.error('Error updating outreach message:', err);
      }
    }
    
    setQueue(prev => prev.map((q, i) => 
      i === index ? { ...q, copied: true } : q
    ));
  };

  const completedCount = queue.filter(q => q.status === 'done').length;
  const isAllDone = completedCount === queue.length;
  const isFeedback = outreachType === 'feedback_request';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Bulk {isFeedback ? 'Feedback Request' : 'DM'} Generation
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
