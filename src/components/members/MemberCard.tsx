import { format, parseISO, differenceInDays } from 'date-fns';
import { MessageSquare, FileText, Calendar, Clock, Send, CheckCircle, Loader2, AlertCircle, Target, Mail } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Member, EngagementStatus, MessageStatus } from '@/types/member';
import { SkoolUsernameInput } from './SkoolUsernameInput';
import { MemberTagBadges } from './MemberTagBadges';
import { MemberTag } from '@/hooks/useMemberTags';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onGenerateDM: () => void;
  isGenerating: boolean;
  onClick: () => void;
  onUpdateUsername: (username: string) => Promise<void>;
  onUpdateEngagementStatus?: (status: EngagementStatus) => void;
  tags?: MemberTag[];
}

const statusConfig: Record<EngagementStatus, { label: string; className: string }> = {
  never_engaged: { label: 'Never Engaged', className: 'bg-destructive text-destructive-foreground' },
  at_risk: { label: 'At Risk', className: 'bg-[hsl(30,100%,50%)] text-primary-foreground' },
  inactive: { label: 'Inactive', className: 'bg-[hsl(45,100%,50%)] text-primary-foreground' },
  active: { label: 'Active', className: 'bg-[hsl(142,76%,36%)] text-primary-foreground' },
  unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground' },
};

const messageStatusConfig: Record<MessageStatus, { label: string; className: string; icon: React.ReactNode }> = {
  not_contacted: { label: 'Not Contacted', className: 'text-muted-foreground', icon: <Mail className="h-3 w-3" /> },
  message_generated: { label: 'DM Ready', className: 'bg-accent text-accent-foreground', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Sent', className: 'bg-primary/15 text-primary border-primary/30', icon: <Send className="h-3 w-3" /> },
  replied: { label: 'Replied', className: 'bg-[hsl(142,76%,36%)]/15 text-[hsl(142,76%,36%)] border-[hsl(142,76%,36%)]/30', icon: <CheckCircle className="h-3 w-3" /> },
};

export function MemberCard({ 
  member, 
  isSelected, 
  onSelect, 
  onGenerateDM, 
  isGenerating,
  onClick,
  onUpdateUsername,
  onUpdateEngagementStatus,
  tags = [],
}: MemberCardProps) {
  const engagementStatus = statusConfig[member.engagement_status] || statusConfig.unknown;
  const msgStatus = messageStatusConfig[member.message_status] || messageStatusConfig.not_contacted;
  
  const joinDaysAgo = member.join_date 
    ? differenceInDays(new Date(), parseISO(member.join_date))
    : null;

  const lastActiveDaysAgo = member.last_active
    ? differenceInDays(new Date(), parseISO(member.last_active))
    : null;

  const applicationAnswer = member.application_answer || '';
  const hasLearningGoals = applicationAnswer.trim().length > 0;

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center flex-wrap gap-2">
              <button 
                onClick={onClick}
                className="text-lg font-semibold hover:text-primary transition-colors text-left"
              >
                {member.skool_name}
              </button>
              <Select
                value={member.engagement_status}
                onValueChange={(value) => {
                  onUpdateEngagementStatus?.(value as EngagementStatus);
                }}
              >
                <SelectTrigger className="h-6 w-auto gap-1 px-2 border-0 focus:ring-0" onClick={(e) => e.stopPropagation()}>
                  <Badge className={cn("text-xs", engagementStatus.className)}>
                    {engagementStatus.label}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ Active</SelectItem>
                  <SelectItem value="at_risk">⚠️ At Risk</SelectItem>
                  <SelectItem value="inactive">💤 Inactive</SelectItem>
                  <SelectItem value="never_engaged">🔴 Never Engaged</SelectItem>
                  <SelectItem value="unknown">❓ Unknown</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className={cn("text-xs flex items-center gap-1", msgStatus.className)}>
                {msgStatus.icon}
                {msgStatus.label}
              </Badge>
            </div>
            {tags.length > 0 && (
              <MemberTagBadges tags={tags} maxVisible={5} className="mt-1" />
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onGenerateDM();
              }}
              disabled={isGenerating}
              className="shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Generate DM
                </>
              )}
            </Button>
          </div>

          {/* Join date and last active */}
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {member.join_date 
                ? `Joined ${format(parseISO(member.join_date), 'MMM d, yyyy')} (${joinDaysAgo} days ago)`
                : 'Join date unknown'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Last active: {lastActiveDaysAgo !== null ? `${lastActiveDaysAgo} days ago` : 'Never'}
            </span>
          </div>

          {/* Learning Goals Section */}
          <div className="mt-3 p-3 rounded-lg bg-accent/40 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">When they joined, they wanted to learn:</span>
            </div>
            {hasLearningGoals ? (
              <p className="text-sm italic text-foreground/80 leading-relaxed">
                "{applicationAnswer}"
              </p>
            ) : (
              <p className="text-sm italic text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                No application answer provided
              </p>
            )}
          </div>

          {/* Activity stats and Skool username */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {member.post_count} posts, {member.comment_count} comments
            </span>
            {member.outreach_sent_at && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Send className="h-3.5 w-3.5" />
                Contacted {format(parseISO(member.outreach_sent_at), 'MMM d')}
              </span>
            )}
            <SkoolUsernameInput
              username={member.skool_username}
              onSave={onUpdateUsername}
              compact
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
