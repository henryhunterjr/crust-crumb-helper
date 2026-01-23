import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { MessageSquare, FileText, Calendar, Clock, Send, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Member, EngagementStatus } from '@/types/member';
import { cn } from '@/lib/utils';

interface MemberCardProps {
  member: Member;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onGenerateDM: () => void;
  isGenerating: boolean;
  onClick: () => void;
}

const statusConfig: Record<EngagementStatus, { label: string; className: string }> = {
  never_engaged: { label: 'Never Engaged', className: 'bg-destructive text-destructive-foreground' },
  at_risk: { label: 'At Risk', className: 'bg-[hsl(30,100%,50%)] text-primary-foreground' },
  inactive: { label: 'Inactive', className: 'bg-[hsl(45,100%,50%)] text-primary-foreground' },
  active: { label: 'Active', className: 'bg-[hsl(142,76%,36%)] text-primary-foreground' },
  unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground' },
};

export function MemberCard({ 
  member, 
  isSelected, 
  onSelect, 
  onGenerateDM, 
  isGenerating,
  onClick 
}: MemberCardProps) {
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  
  const status = statusConfig[member.engagement_status] || statusConfig.unknown;
  
  const joinDaysAgo = member.join_date 
    ? differenceInDays(new Date(), parseISO(member.join_date))
    : null;

  const lastActiveDaysAgo = member.last_active
    ? differenceInDays(new Date(), parseISO(member.last_active))
    : null;

  const outreachStatus = member.outreach_responded
    ? 'Responded ✓'
    : member.outreach_sent && member.outreach_sent_at
    ? `Contacted ${format(parseISO(member.outreach_sent_at), 'MMM d')}`
    : 'Not contacted';

  const applicationAnswer = member.application_answer || '';
  const shouldTruncate = applicationAnswer.length > 120;
  const displayAnswer = showFullAnswer 
    ? applicationAnswer 
    : applicationAnswer.slice(0, 120) + (shouldTruncate ? '...' : '');

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
            <div>
              <button 
                onClick={onClick}
                className="text-lg font-semibold hover:text-primary transition-colors text-left"
              >
                {member.skool_name}
              </button>
              <Badge className={cn("ml-2 text-xs", status.className)}>
                {status.label}
              </Badge>
            </div>
            
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

          {/* Application answer */}
          {applicationAnswer && (
            <div className="mt-2">
              <p className="text-sm italic text-muted-foreground">
                "{displayAnswer}"
              </p>
              {shouldTruncate && (
                <button
                  onClick={() => setShowFullAnswer(!showFullAnswer)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {showFullAnswer ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>Show more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Activity stats and outreach status */}
          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              {member.post_count} posts, {member.comment_count} comments
            </span>
            <span className={cn(
              "flex items-center gap-1",
              member.outreach_responded ? "text-[hsl(142,76%,36%)]" : 
              member.outreach_sent ? "text-primary" : "text-muted-foreground"
            )}>
              {member.outreach_responded ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : member.outreach_sent ? (
                <Send className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {outreachStatus}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
