import { useState } from 'react';
import { Mail, Plus, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailCampaign, EmailSubscriber, useCreateCampaign, useUpdateCampaign } from '@/hooks/useEmailCampaigns';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CampaignListProps {
  campaigns: EmailCampaign[];
  subscribers: EmailSubscriber[];
  onViewDrafts: (campaignId: string) => void;
}

export function CampaignList({ campaigns, subscribers, onViewDrafts }: CampaignListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('recruitment');
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();

  const nonMembers = subscribers.filter(s => !s.is_skool_member).length;
  const inactiveWithEmail = subscribers.filter(s => s.is_skool_member).length; // Approximate

  const handleCreate = () => {
    const segment = type === 'recruitment' ? 'non_members' : type === 'reengagement' ? 'inactive_members' : 'active_members';
    const count = type === 'recruitment' ? nonMembers : type === 'reengagement' ? inactiveWithEmail : inactiveWithEmail;

    createCampaign.mutate({
      campaign_name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} Campaign`,
      campaign_type: type,
      target_segment: segment,
      email_count: count,
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setName('');
        toast.success('Campaign created');
      },
    });
  };

  const handleMarkSent = (id: string) => {
    updateCampaign.mutate({ id, status: 'sent', sent_at: new Date().toISOString() }, {
      onSuccess: () => toast.success('Campaign marked as sent'),
    });
  };

  const typeConfig: Record<string, { icon: string; color: string }> = {
    recruitment: { icon: '📧', color: 'bg-primary/10 text-primary' },
    reengagement: { icon: '📧', color: 'bg-amber-500/10 text-amber-700' },
    digest: { icon: '📧', color: 'bg-emerald-500/10 text-emerald-700' },
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Active Campaigns</h3>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
          <p className="text-muted-foreground mb-4">Create your first email campaign to get started</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => {
            const cfg = typeConfig[campaign.campaign_type] || typeConfig.recruitment;
            return (
              <Card key={campaign.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{cfg.icon}</span>
                        <h4 className="font-medium">{campaign.campaign_name}</h4>
                        <Badge variant="outline" className="text-xs">{campaign.campaign_type}</Badge>
                        <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'} className="text-xs">
                          {campaign.status === 'sent' ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Sent</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" />Draft</>
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Target: {campaign.email_count} {campaign.target_segment.replace('_', ' ')}
                        {campaign.sent_at && ` · Sent ${formatDistanceToNow(new Date(campaign.sent_at), { addSuffix: true })}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDrafts(campaign.id)}>
                        View Drafts
                      </Button>
                      {campaign.status !== 'sent' && (
                        <Button size="sm" variant="ghost" onClick={() => handleMarkSent(campaign.id)}>
                          Mark Sent
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Email Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. February Recruitment"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Campaign Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruitment">Recruitment (Non-Members)</SelectItem>
                  <SelectItem value="reengagement">Re-engagement (Inactive)</SelectItem>
                  <SelectItem value="digest">Weekly Digest (Active)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCampaign.isPending}>
              {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
