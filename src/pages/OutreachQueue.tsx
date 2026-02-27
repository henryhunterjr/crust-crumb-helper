import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Copy, Check, CheckCircle, RotateCcw, SkipForward, 
  ChevronLeft, ChevronRight, Loader2, Edit2, Filter, ExternalLink
} from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { copyAndOpenSkool } from '@/lib/skoolLinks';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers } from '@/hooks/useMembers';
import { useOutreachMessages } from '@/hooks/useOutreachMessages';
import { Member, OutreachType } from '@/types/member';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type QueueItemStatus = 'pending' | 'generating' | 'generated' | 'approved' | 'sent' | 'skipped' | 'error';
type PriorityLevel = 'high' | 'medium' | 'low';
type SegmentFilter = 'all' | 'never_engaged' | 'at_risk' | 'inactive' | 'needs_welcome';

interface QueueItem {
  member: Member;
  priority: PriorityLevel;
  priorityReason: string;
  message: string | null;
  status: QueueItemStatus;
  isEditing: boolean;
  editedMessage: string;
  outreachMessageId: string | null;
}

function getPriority(member: Member): { level: PriorityLevel; reason: string } {
  const today = new Date();
  const joinDays = member.join_date ? differenceInDays(today, parseISO(member.join_date)) : 0;

  if (member.engagement_status === 'never_engaged' && joinDays >= 7) {
    return { level: 'high', reason: `Never engaged, joined ${joinDays}d ago` };
  }
  if (member.engagement_status === 'at_risk') {
    const inactiveDays = member.last_active ? differenceInDays(today, parseISO(member.last_active)) : 0;
    return { level: 'high', reason: `At risk, inactive ${inactiveDays}d` };
  }
  if (!member.outreach_sent && joinDays >= 3) {
    return { level: 'medium', reason: `Needs welcome, ${joinDays}d since join` };
  }
  if (member.engagement_status === 'inactive') {
    return { level: 'medium', reason: 'Inactive 30+ days' };
  }
  if (member.engagement_status === 'active') {
    return { level: 'low', reason: 'Active – encourage/congratulate' };
  }
  return { level: 'low', reason: 'Standard outreach' };
}

const BATCH_SIZE = 25;

export default function OutreachQueue() {
  const navigate = useNavigate();
  const { members, markOutreachSent, updateMember } = useMembers();
  const { saveMessage, updateMessageStatus } = useOutreachMessages();

  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>('all');
  const [outreachType, setOutreachType] = useState<OutreachType>('welcome_message');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchOffset, setBatchOffset] = useState(0);

  // Priority-sorted members needing outreach
  const eligibleMembers = useMemo(() => {
    const today = new Date();
    let filtered = members.filter(m => m.message_status !== 'sent' && m.message_status !== 'replied');

    switch (segmentFilter) {
      case 'never_engaged':
        filtered = filtered.filter(m => m.engagement_status === 'never_engaged');
        break;
      case 'at_risk':
        filtered = filtered.filter(m => m.engagement_status === 'at_risk');
        break;
      case 'inactive':
        filtered = filtered.filter(m => m.engagement_status === 'inactive');
        break;
      case 'needs_welcome':
        filtered = filtered.filter(m => {
          if (!m.join_date || m.outreach_sent) return false;
          return differenceInDays(today, parseISO(m.join_date)) >= 3;
        });
        break;
    }

    return filtered
      .map(m => ({ member: m, ...getPriority(m) }))
      .sort((a, b) => {
        const order: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };
        return order[a.level] - order[b.level];
      });
  }, [members, segmentFilter]);

  const currentBatch = useMemo(() => {
    return eligibleMembers.slice(batchOffset, batchOffset + BATCH_SIZE);
  }, [eligibleMembers, batchOffset]);

  const loadBatch = useCallback(() => {
    setQueue(currentBatch.map(({ member, level, reason }) => ({
      member,
      priority: level,
      priorityReason: reason,
      message: null,
      status: 'pending',
      isEditing: false,
      editedMessage: '',
      outreachMessageId: null,
    })));
    setCurrentIndex(0);
  }, [currentBatch]);

  // Load initial batch
  useEffect(() => {
    if (queue.length === 0 && currentBatch.length > 0) {
      loadBatch();
    }
  }, [currentBatch.length]);

  const generateAll = async () => {
    setIsGenerating(true);

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'pending') continue;

      setQueue(prev => prev.map((q, idx) =>
        idx === i ? { ...q, status: 'generating' } : q
      ));

      const member = queue[i].member;
      let attempts = 0;

      while (attempts < 3) {
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
              outreach_type: outreachType,
            },
          });

          if (error) throw error;
          if (!data?.message) throw new Error('No message returned');

          // Save to outreach log
          let savedId: string | null = null;
          try {
            const saved = await saveMessage.mutateAsync({
              member_id: member.id,
              member_name: member.skool_name,
              message_type: outreachType,
              message_text: data.message,
            });
            savedId = saved.id;
            updateMember.mutate({ id: member.id, updates: { message_status: 'message_generated' } });
          } catch (e) {
            console.error('Error saving outreach message:', e);
          }

          setQueue(prev => prev.map((q, idx) =>
            idx === i ? {
              ...q,
              status: 'generated',
              message: data.message,
              editedMessage: data.message,
              outreachMessageId: savedId,
            } : q
          ));
          break;
        } catch (err) {
          attempts++;
          if (attempts >= 3) {
            setQueue(prev => prev.map((q, idx) =>
              idx === i ? { ...q, status: 'error', message: 'Failed after 3 attempts' } : q
            ));
          } else {
            await new Promise(r => setTimeout(r, 1000 * attempts));
          }
        }
      }
    }

    setIsGenerating(false);
    toast.success('Batch generation complete!');
  };

  const handleCopy = async (index: number) => {
    const item = queue[index];
    const text = item.isEditing ? item.editedMessage : (item.message || '');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleApprove = (index: number) => {
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, status: 'approved', message: q.isEditing ? q.editedMessage : q.message, isEditing: false } : q
    ));
  };

  const handleApproveAll = () => {
    setQueue(prev => prev.map(q =>
      q.status === 'generated' ? { ...q, status: 'approved' } : q
    ));
  };

  const handleSkip = (index: number) => {
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, status: 'skipped' } : q
    ));
    if (index === currentIndex && currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMarkSent = async (index: number) => {
    const item = queue[index];
    markOutreachSent.mutate(item.member.id);
    if (item.outreachMessageId) {
      updateMessageStatus.mutate({ id: item.outreachMessageId, status: 'sent' });
    }
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, status: 'sent' } : q
    ));
    // Auto-advance
    if (index === currentIndex) {
      const nextApproved = queue.findIndex((q, i) => i > index && q.status === 'approved');
      if (nextApproved >= 0) setCurrentIndex(nextApproved);
    }
    toast.success('Marked as sent!');
  };

  const handleRegenerate = async (index: number) => {
    const member = queue[index].member;
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, status: 'generating', message: null } : q
    ));

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
          outreach_type: outreachType,
        },
      });

      if (error) throw error;

      setQueue(prev => prev.map((q, i) =>
        i === index ? { ...q, status: 'generated', message: data.message, editedMessage: data.message } : q
      ));
    } catch {
      setQueue(prev => prev.map((q, i) =>
        i === index ? { ...q, status: 'error', message: 'Regeneration failed' } : q
      ));
    }
  };

  const toggleEdit = (index: number) => {
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, isEditing: !q.isEditing } : q
    ));
  };

  const handleEditChange = (index: number, text: string) => {
    setQueue(prev => prev.map((q, i) =>
      i === index ? { ...q, editedMessage: text } : q
    ));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!queue.length) return;
      const item = queue[currentIndex];
      if (!item) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' && !window.getSelection()?.toString()) {
          e.preventDefault();
          handleCopy(currentIndex);
        }
        if (e.key === 'Enter' && (item.status === 'approved' || item.status === 'generated')) {
          e.preventDefault();
          handleMarkSent(currentIndex);
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleSkip(currentIndex);
        }
        if (e.key === 'e') {
          e.preventDefault();
          toggleEdit(currentIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [queue, currentIndex]);

  // Stats
  const sentCount = queue.filter(q => q.status === 'sent').length;
  const approvedCount = queue.filter(q => q.status === 'approved').length;
  const generatedCount = queue.filter(q => q.status === 'generated' || q.status === 'approved').length;
  const progressPct = queue.length > 0 ? Math.round((sentCount / queue.length) * 100) : 0;

  const getPriorityBadge = (level: PriorityLevel) => {
    switch (level) {
      case 'high': return <Badge variant="destructive" className="text-xs">🔴 HIGH</Badge>;
      case 'medium': return <Badge variant="secondary" className="text-xs">🟡 MED</Badge>;
      case 'low': return <Badge variant="outline" className="text-xs">🟢 LOW</Badge>;
    }
  };

  const getStatusBadge = (status: QueueItemStatus) => {
    switch (status) {
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      case 'generating': return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Generating</Badge>;
      case 'generated': return <Badge variant="secondary">Generated</Badge>;
      case 'approved': return <Badge variant="default">Approved</Badge>;
      case 'sent': return <Badge variant="default">✓ Sent</Badge>;
      case 'skipped': return <Badge variant="outline">Skipped</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Outreach Queue</h1>
            <p className="text-muted-foreground">
              {eligibleMembers.length} members eligible for outreach
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={segmentFilter} onValueChange={v => { setSegmentFilter(v as SegmentFilter); setBatchOffset(0); setQueue([]); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="never_engaged">Never Engaged</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="inactive">Inactive 30+</SelectItem>
                <SelectItem value="needs_welcome">Needs Welcome</SelectItem>
              </SelectContent>
            </Select>
            <Select value={outreachType} onValueChange={v => setOutreachType(v as OutreachType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome_message">Welcome</SelectItem>
                <SelectItem value="resource_recommendation">Resources</SelectItem>
                <SelectItem value="feedback_request">Feedback</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Progress Bar */}
        {queue.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {sentCount} of {queue.length} messages sent today
                </span>
                <span className="text-sm text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="h-3" />
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>{generatedCount} generated</span>
                <span>{approvedCount} approved</span>
                <span>{sentCount} sent</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          <Button onClick={() => { loadBatch(); }} variant="outline" disabled={currentBatch.length === 0}>
            Load {Math.min(BATCH_SIZE, eligibleMembers.length - batchOffset)} Members
          </Button>
          <Button onClick={generateAll} disabled={isGenerating || queue.length === 0}>
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" />Generate All {queue.filter(q => q.status === 'pending').length}</>
            )}
          </Button>
          {generatedCount > 0 && (
            <Button onClick={handleApproveAll} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve All ({queue.filter(q => q.status === 'generated').length})
            </Button>
          )}
        </div>

        {/* Queue list */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {queue.map((item, index) => (
              <Card
                key={item.member.id}
                className={currentIndex === index ? 'border-primary ring-1 ring-primary/20' : ''}
                onClick={() => setCurrentIndex(index)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{index + 1}/{queue.length}</span>
                      <span className="font-medium">{item.member.skool_name}</span>
                      {getPriorityBadge(item.priority)}
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">{item.priorityReason}</p>

                  {item.member.application_answer && (
                    <p className="text-xs bg-muted/50 rounded p-2 mb-3 line-clamp-2">
                      <span className="font-medium">Learning goals:</span> {item.member.application_answer}
                    </p>
                  )}

                  {item.isEditing ? (
                    <Textarea
                      value={item.editedMessage}
                      onChange={(e) => handleEditChange(index, e.target.value)}
                      className="mb-3 text-sm min-h-[120px]"
                    />
                  ) : item.message && item.status !== 'pending' ? (
                    <div className="bg-muted/50 rounded-md p-3 text-sm mb-3 whitespace-pre-wrap">
                      {item.message}
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  {(item.status === 'generated' || item.status === 'approved') && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleCopy(index)} aria-label="Copy message">
                        <Copy className="h-3 w-3 mr-1" />Copy
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Copy message and open Skool"
                        onClick={async () => {
                          const text = item.isEditing ? item.editedMessage : (item.message || '');
                          const success = await copyAndOpenSkool(text, item.member.skool_username);
                          if (success) toast.success('Copied! Opening Skool...');
                          else toast.error('Failed to copy');
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />Open Skool
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleEdit(index)} aria-label={item.isEditing ? 'Finish editing' : 'Edit message'}>
                        <Edit2 className="h-3 w-3 mr-1" />{item.isEditing ? 'Done' : 'Edit'}
                      </Button>
                      {item.status === 'generated' && (
                        <Button size="sm" onClick={() => handleApprove(index)} aria-label="Approve message">
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleRegenerate(index)} aria-label="Regenerate message">
                        <RotateCcw className="h-3 w-3 mr-1" />Regenerate
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSkip(index)} aria-label="Skip this member">
                        <SkipForward className="h-3 w-3 mr-1" />Skip
                      </Button>
                      {item.status === 'approved' && (
                        <Button size="sm" onClick={() => handleMarkSent(index)} aria-label="Mark as sent">
                          <CheckCircle className="h-3 w-3 mr-1" />Mark Sent
                        </Button>
                      )}
                      {item.status === 'approved' && (
                        <Button size="sm" onClick={() => handleMarkSent(index)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Mark Sent
                        </Button>
                      )}
                    </div>
                  )}

                  {item.status === 'sent' && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-primary" />
                      Message sent
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Batch pagination */}
        {eligibleMembers.length > BATCH_SIZE && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {batchOffset + 1}–{Math.min(batchOffset + BATCH_SIZE, eligibleMembers.length)} of {eligibleMembers.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBatchOffset(Math.max(0, batchOffset - BATCH_SIZE)); setQueue([]); }}
                disabled={batchOffset === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBatchOffset(batchOffset + BATCH_SIZE); setQueue([]); }}
                disabled={batchOffset + BATCH_SIZE >= eligibleMembers.length}
              >
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="mt-6 text-xs text-muted-foreground border rounded-lg p-3">
          <span className="font-medium">Keyboard shortcuts: </span>
          Ctrl+C = Copy · Ctrl+Enter = Mark Sent + Next · Ctrl+→ = Skip · Ctrl+E = Edit
        </div>
      </main>

      <Footer />
    </div>
  );
}
