import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Calendar, Clock, FileText, MessageSquare, Send, CheckCircle, Save, Link2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Member, EngagementStatus } from '@/types/member';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MemberDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member | null;
  onUpdate: (updates: Partial<Member>) => void;
  onMarkResponded: () => void;
}

const statusConfig: Record<EngagementStatus, { label: string; className: string }> = {
  never_engaged: { label: 'Never Engaged', className: 'bg-destructive text-destructive-foreground' },
  at_risk: { label: 'At Risk', className: 'bg-[hsl(30,100%,50%)] text-primary-foreground' },
  inactive: { label: 'Inactive', className: 'bg-[hsl(45,100%,50%)] text-primary-foreground' },
  active: { label: 'Active', className: 'bg-[hsl(142,76%,36%)] text-primary-foreground' },
  unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground' },
};

export function MemberDetailDialog({
  open,
  onOpenChange,
  member,
  onUpdate,
  onMarkResponded,
}: MemberDetailDialogProps) {
  const [notes, setNotes] = useState(member?.notes || '');
  const [status, setStatus] = useState<EngagementStatus>(member?.engagement_status || 'unknown');
  const [skoolUsername, setSkoolUsername] = useState(member?.skool_username || '');
  const [hasChanges, setHasChanges] = useState(false);

  if (!member) return null;

  const joinDaysAgo = member.join_date 
    ? differenceInDays(new Date(), parseISO(member.join_date))
    : null;

  const lastActiveDaysAgo = member.last_active
    ? differenceInDays(new Date(), parseISO(member.last_active))
    : null;

  const handleSave = () => {
    onUpdate({ notes, engagement_status: status, skool_username: skoolUsername || null });
    setHasChanges(false);
    toast.success('Member updated');
  };

  const handleSkoolUsernameChange = (value: string) => {
    setSkoolUsername(value);
    setHasChanges(true);
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setHasChanges(true);
  };

  const handleStatusChange = (value: EngagementStatus) => {
    setStatus(value);
    setHasChanges(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {member.skool_name}
            <Badge className={cn("text-xs", statusConfig[member.engagement_status]?.className)}>
              {statusConfig[member.engagement_status]?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Member info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Joined: {member.join_date 
                  ? `${format(parseISO(member.join_date), 'MMM d, yyyy')} (${joinDaysAgo}d ago)`
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Last active: {lastActiveDaysAgo !== null ? `${lastActiveDaysAgo} days ago` : 'Never'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{member.post_count} posts</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{member.comment_count} comments</span>
            </div>
          </div>

          {/* Application answer */}
          {member.application_answer && (
            <div>
              <Label className="text-xs text-muted-foreground">Goal when joining</Label>
              <p className="mt-1 text-sm italic bg-muted/50 p-3 rounded-md">
                "{member.application_answer}"
              </p>
            </div>
          )}

          {/* Email if available */}
          {member.email && (
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="mt-1 text-sm">{member.email}</p>
            </div>
          )}

          {/* Skool Username */}
          <div>
            <Label htmlFor="skoolUsername" className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Skool Username
            </Label>
            <Input
              id="skoolUsername"
              value={skoolUsername}
              onChange={(e) => handleSkoolUsernameChange(e.target.value)}
              placeholder="e.g. josh-malcom-8453"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used for direct profile links. Find in their profile URL: skool.com/@<strong>username</strong>
            </p>
          </div>

          {/* Outreach status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <div>
              <Label className="text-sm font-medium">Outreach Status</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {member.outreach_sent 
                  ? `Contacted ${member.outreach_sent_at ? format(parseISO(member.outreach_sent_at), 'MMM d, yyyy') : ''}`
                  : 'Not contacted yet'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="responded"
                  checked={member.outreach_responded}
                  onCheckedChange={() => onMarkResponded()}
                  disabled={!member.outreach_sent}
                />
                <Label htmlFor="responded" className="text-sm">Responded</Label>
              </div>
            </div>
          </div>

          {/* Status selector */}
          <div>
            <Label htmlFor="status">Engagement Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="never_engaged">Never Engaged</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about conversations, follow-ups, etc."
              className="mt-1 min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
