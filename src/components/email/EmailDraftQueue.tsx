import { useState, useMemo } from 'react';
import { RefreshCw, Copy, Check, X, FileDown, Sparkles, CheckCheck, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  EmailCampaign,
  EmailDraft,
  useEmailDrafts,
  useEmailSubscribers,
  useSaveEmailDraft,
  useUpdateEmailDraft,
  useBulkUpdateDraftStatus,
} from '@/hooks/useEmailCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailDraftQueueProps {
  campaignId: string | null;
  campaigns: EmailCampaign[];
  onSelectCampaign: (id: string | null) => void;
}

export function EmailDraftQueue({ campaignId, campaigns, onSelectCampaign }: EmailDraftQueueProps) {
  const { data: drafts = [], isLoading } = useEmailDrafts(campaignId);
  const { data: subscribers = [] } = useEmailSubscribers();
  const saveDraft = useSaveEmailDraft();
  const updateDraft = useUpdateEmailDraft();
  const bulkUpdate = useBulkUpdateDraftStatus();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(-1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  const campaign = campaigns.find(c => c.id === campaignId);

  const handleGenerateAll = async () => {
    if (!campaign || !campaignId) return;
    setIsGenerating(true);

    try {
      // Get target subscribers based on campaign type
      let targets = subscribers;
      if (campaign.campaign_type === 'recruitment') {
        targets = subscribers.filter(s => !s.is_skool_member);
      } else if (campaign.campaign_type === 'reengagement') {
        targets = subscribers.filter(s => s.is_skool_member);
      } else {
        targets = subscribers.filter(s => s.is_skool_member);
      }

      for (let i = 0; i < targets.length; i++) {
        const sub = targets[i];
        setGeneratingIndex(i);

        try {
          const { data, error } = await supabase.functions.invoke('generate-email', {
            body: {
              campaign_type: campaign.campaign_type,
              subscriber: sub,
            },
          });

          if (error) throw error;

          await saveDraft.mutateAsync({
            campaign_id: campaignId,
            subscriber_id: sub.id,
            member_id: sub.matched_member_id,
            recipient_email: sub.email,
            recipient_name: [sub.first_name, sub.last_name].filter(Boolean).join(' ') || null,
            subject: data.subject || 'No subject',
            body_text: data.body || '',
            status: 'draft',
            personalization_data: {},
          });
        } catch (err) {
          console.error(`Error generating email for ${sub.email}:`, err);
        }
      }

      toast.success(`Generated ${targets.length} email drafts`);
    } catch (err) {
      console.error(err);
      toast.error('Generation failed');
    } finally {
      setIsGenerating(false);
      setGeneratingIndex(-1);
    }
  };

  const handleCopyEmail = async (draft: EmailDraft) => {
    const text = `Subject: ${draft.subject}\n\n${draft.body_text}`;
    await navigator.clipboard.writeText(text);
    toast.success('Email copied to clipboard');
  };

  const handleApprove = (id: string) => {
    updateDraft.mutate({ id, status: 'approved' });
  };

  const handleSkip = (id: string) => {
    updateDraft.mutate({ id, status: 'skipped' });
  };

  const handleApproveAll = () => {
    const draftIds = drafts.filter(d => d.status === 'draft').map(d => d.id);
    if (draftIds.length === 0) return;
    bulkUpdate.mutate({ ids: draftIds, status: 'approved' }, {
      onSuccess: () => toast.success(`Approved ${draftIds.length} drafts`),
    });
  };

  const handleStartEdit = (draft: EmailDraft) => {
    setEditingId(draft.id);
    setEditSubject(draft.subject);
    setEditBody(draft.body_text);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateDraft.mutate({ id: editingId, subject: editSubject, body_text: editBody }, {
      onSuccess: () => {
        setEditingId(null);
        toast.success('Draft updated');
      },
    });
  };

  const handleExportCSV = () => {
    const approved = drafts.filter(d => d.status === 'approved');
    if (approved.length === 0) {
      toast.error('No approved drafts to export');
      return;
    }

    const headers = ['email', 'first_name', 'subject', 'body_text'];
    const rows = approved.map(d => [
      d.recipient_email,
      d.recipient_name || '',
      `"${d.subject.replace(/"/g, '""')}"`,
      `"${d.body_text.replace(/"/g, '""').replace(/\n/g, '\\n')}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${campaign?.campaign_name || 'campaign'}-drafts.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${approved.length} approved drafts`);
  };

  const approvedCount = drafts.filter(d => d.status === 'approved').length;
  const draftCount = drafts.filter(d => d.status === 'draft').length;

  if (!campaignId) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Select a campaign</label>
          <Select value={campaignId || ''} onValueChange={onSelectCampaign}>
            <SelectTrigger className="mt-1 w-64">
              <SelectValue placeholder="Choose campaign..." />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.campaign_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {campaigns.length === 0 && (
          <p className="text-muted-foreground text-sm">Create a campaign first in the Campaigns tab.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{campaign?.campaign_name} — {drafts.length} Drafts</h3>
          <p className="text-xs text-muted-foreground">
            {draftCount} pending · {approvedCount} approved · {drafts.filter(d => d.status === 'skipped').length} skipped
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onSelectCampaign(null)}>
            Back
          </Button>
          {drafts.length === 0 && (
            <Button size="sm" onClick={handleGenerateAll} disabled={isGenerating}>
              {isGenerating ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Generating {generatingIndex + 1}...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate All</>
              )}
            </Button>
          )}
          {drafts.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleApproveAll} disabled={draftCount === 0}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Approve All ({draftCount})
              </Button>
              <Button size="sm" onClick={handleExportCSV} disabled={approvedCount === 0}>
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV ({approvedCount})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Draft list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading drafts...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No drafts yet. Click "Generate All" to create email drafts.
        </div>
      ) : (
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {drafts.map((draft, idx) => (
              <Card key={draft.id} className={draft.status === 'skipped' ? 'opacity-50' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{idx + 1}/{drafts.length}</span>
                        <span className="font-medium text-sm">{draft.recipient_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">({draft.recipient_email})</span>
                        <Badge
                          variant={draft.status === 'approved' ? 'default' : draft.status === 'skipped' ? 'outline' : 'secondary'}
                          className="text-[10px]"
                        >
                          {draft.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {editingId === draft.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editSubject}
                        onChange={e => setEditSubject(e.target.value)}
                        placeholder="Subject"
                        className="text-sm"
                      />
                      <Textarea
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        className="min-h-[150px] text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Subject: {draft.subject}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{draft.body_text}</p>
                    </>
                  )}

                  {editingId !== draft.id && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleStartEdit(draft)}>
                        <Edit className="h-3 w-3 mr-1" />Edit
                      </Button>
                      {draft.status !== 'approved' && (
                        <Button size="sm" variant="outline" onClick={() => handleApprove(draft.id)}>
                          <Check className="h-3 w-3 mr-1" />Approve
                        </Button>
                      )}
                      {draft.status !== 'skipped' && (
                        <Button size="sm" variant="ghost" onClick={() => handleSkip(draft.id)}>
                          <X className="h-3 w-3 mr-1" />Skip
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleCopyEmail(draft)}>
                        <Copy className="h-3 w-3 mr-1" />Copy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
