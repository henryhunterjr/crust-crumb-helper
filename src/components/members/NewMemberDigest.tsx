import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Member } from '@/types/member';
import { differenceInDays, parseISO, format } from 'date-fns';

interface NewMemberDigestProps {
  members: Member[];
}

export function NewMemberDigest({ members }: NewMemberDigestProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const newMembersThisWeek = useMemo(() => {
    const today = new Date();
    return members.filter(m => {
      if (!m.join_date) return false;
      const joinDate = parseISO(m.join_date);
      return differenceInDays(today, joinDate) <= 7;
    }).sort((a, b) => {
      // Sort by join date descending (newest first)
      return (b.join_date || '').localeCompare(a.join_date || '');
    });
  }, [members]);

  if (newMembersThisWeek.length === 0) {
    return null;
  }

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(newMembersThisWeek.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleGenerateWelcomePost = () => {
    const selectedMembers = newMembersThisWeek.filter(m => selectedIds.has(m.id));
    const names = selectedMembers.map(m => m.skool_name).join(', ');
    
    // Navigate to generate page with pre-filled data
    navigate('/generate', {
      state: {
        topic: `Welcome post for our new members: ${names}`,
        postType: 'new-member-welcome',
        targetAudience: 'new-members',
        memberNames: selectedMembers.map(m => m.skool_name),
      }
    });
  };

  const allSelected = newMembersThisWeek.length > 0 && 
    newMembersThisWeek.every(m => selectedIds.has(m.id));

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Weekly Digest: {newMembersThisWeek.length} New Member{newMembersThisWeek.length !== 1 ? 's' : ''}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">This Week</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!isExpanded ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {newMembersThisWeek.slice(0, 3).map(m => m.skool_name).join(', ')}
              {newMembersThisWeek.length > 3 && ` and ${newMembersThisWeek.length - 3} more...`}
            </p>
            <Button
              size="sm"
              onClick={() => {
                // Select all and navigate directly
                const names = newMembersThisWeek.map(m => m.skool_name).join(', ');
                navigate('/generate', {
                  state: {
                    topic: `Welcome post for our new members: ${names}`,
                    postType: 'new-member-welcome',
                    targetAudience: 'new-members',
                    memberNames: newMembersThisWeek.map(m => m.skool_name),
                  }
                });
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Welcome Post for All
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select all */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm font-medium">
                Select all ({newMembersThisWeek.length})
              </span>
            </div>

            {/* Member list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {newMembersThisWeek.map(member => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50"
                >
                  <Checkbox
                    checked={selectedIds.has(member.id)}
                    onCheckedChange={(checked) => handleToggleSelect(member.id, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.skool_name}</p>
                    {member.join_date && (
                      <p className="text-xs text-muted-foreground">
                        Joined {format(parseISO(member.join_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  {member.application_answer && (
                    <Badge variant="outline" className="text-xs">
                      Has Goals
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            {/* Action button */}
            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={handleGenerateWelcomePost}
                disabled={selectedIds.size === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Welcome Post ({selectedIds.size} selected)
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
