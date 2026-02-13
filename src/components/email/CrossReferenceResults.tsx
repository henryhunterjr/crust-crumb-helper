import { Search, UserCheck, UserX, HelpCircle, Link, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLinkSubscriberToMember } from '@/hooks/useEmailCampaigns';
import { toast } from 'sonner';

interface CrossReferenceResultsProps {
  results: any | null;
  onRunCrossRef: () => void;
  isLoading: boolean;
}

export function CrossReferenceResults({ results, onRunCrossRef, isLoading }: CrossReferenceResultsProps) {
  const linkMutation = useLinkSubscriberToMember();

  const handleLink = (subscriberId: string, memberId: string) => {
    linkMutation.mutate({ subscriberId, memberId }, {
      onSuccess: () => toast.success('Subscriber linked to member'),
    });
  };

  const handleUnlink = (subscriberId: string) => {
    linkMutation.mutate({ subscriberId, memberId: null }, {
      onSuccess: () => toast.success('Unlinked subscriber'),
    });
  };

  if (!results) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No cross-reference run yet</h3>
        <p className="text-muted-foreground mb-4">
          Click "Cross-Reference" to match your email subscribers against Skool members
        </p>
        <Button onClick={onRunCrossRef} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Run Cross-Reference'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <UserCheck className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{results.matches}</p>
            <p className="text-xs text-muted-foreground">Matched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <UserX className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{results.non_members}</p>
            <p className="text-xs text-muted-foreground">Non-Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <HelpCircle className="h-5 w-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{results.needs_review}</p>
            <p className="text-xs text-muted-foreground">Needs Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Matches */}
      {results.matched?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              Matches Found ({results.matched.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {results.matched.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{m.subscriber.first_name} {m.subscriber.last_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{m.subscriber.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">→ {m.member.skool_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {m.member.engagement_status || 'unknown'}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">✓ Linked</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Non-Members */}
      {results.non_member_list?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserX className="h-4 w-4 text-primary" />
              Non-Members — Recruitment Targets ({results.non_member_list.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {results.non_member_list.slice(0, 50).map((n: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{n.subscriber.first_name || '?'} {n.subscriber.last_name || ''}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{n.subscriber.email}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {n.subscriber.subscription_time 
                        ? new Date(n.subscriber.subscription_time).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
                        : ''}
                    </span>
                  </div>
                ))}
                {results.non_member_list.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ...and {results.non_member_list.length - 50} more
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Needs Review */}
      {results.review_list?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              Needs Review ({results.review_list.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {results.review_list.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.subscriber.first_name} {r.subscriber.last_name}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="font-medium">{r.possible_member.skool_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.confidence}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleLink(r.subscriber.id, r.possible_member.id)}
                      >
                        <Link className="h-3 w-3 mr-1" />
                        Link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleUnlink(r.subscriber.id)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Same
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
