import { Link, useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, isToday, isSameDay, addDays, differenceInDays, parseISO } from 'date-fns';
import { 
  Sparkles, 
  MessageSquare, 
  Calendar, 
  Copy, 
  Check, 
  Clock,
  ChevronRight,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  Send,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScheduledPosts } from '@/hooks/useScheduledPosts';
import { useQuickResponses } from '@/hooks/useQuickResponses';
import { useMembers } from '@/hooks/useMembers';
import { useOutreachMessages } from '@/hooks/useOutreachMessages';
import { ScheduledPost, POST_TYPES, TIME_SLOTS } from '@/types/postIdea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { scheduledPosts } = useScheduledPosts();
  const { data: recentResponses } = useQuickResponses('', null);
  const { members, stats } = useMembers();
  const { messages: outreachMessages } = useOutreachMessages();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  // New members this week
  const newMembersThisWeek = useMemo(() => {
    return members.filter(m => {
      if (!m.join_date) return false;
      const joinDate = parseISO(m.join_date);
      return differenceInDays(today, joinDate) <= 7;
    });
  }, [members, today]);

  // Members needing welcome (joined 3+ days ago, no outreach sent)
  const membersNeedingWelcome = useMemo(() => {
    return members.filter(m => {
      if (!m.join_date) return false;
      if (m.outreach_sent) return false;
      const joinDate = parseISO(m.join_date);
      return differenceInDays(today, joinDate) >= 3;
    });
  }, [members, today]);

  // Today's posts
  const todaysPosts = scheduledPosts.filter(
    post => isSameDay(new Date(post.scheduled_date), today) && post.status === 'planned'
  );

  // This week's posts
  const thisWeeksPosts = scheduledPosts.filter(post => {
    const date = new Date(post.scheduled_date);
    return date >= weekStart && date <= weekEnd;
  });

  // Group by day for week view
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Get recently used responses (sorted by last_used_at, limit 5)
  const recentlyUsed = recentResponses
    ?.filter(r => r.last_used_at)
    .sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())
    .slice(0, 5) || [];

  // Stats
  const plannedThisWeek = thisWeeksPosts.filter(p => p.status === 'planned').length;
  const postedThisWeek = thisWeeksPosts.filter(p => p.status === 'posted').length;
  const totalResponses = recentResponses?.length || 0;
  const queueCount = outreachMessages.filter(m => m.status === 'generated').length;

  const handleGenerateWelcomePost = () => {
    const names = newMembersThisWeek.map(m => m.skool_name).join(', ');
    navigate('/generate', {
      state: {
        topic: `Welcome post for our new members: ${names}`,
        postType: 'new-member-welcome',
        targetAudience: 'new-members',
        memberNames: newMembersThisWeek.map(m => m.skool_name),
      }
    });
  };

  const handleCopyPost = async (post: ScheduledPost) => {
    const fullPost = `${post.title}\n\n${post.content}`;
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopiedId(post.id);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getTimeSlotLabel = (slot: string | null) => {
    return TIME_SLOTS.find(t => t.value === slot)?.label || 'Unscheduled';
  };

  const getPostTypeLabel = (type: string | null) => {
    const found = POST_TYPES.find(t => t.value === type);
    return found ? found.label.split(' ')[0] : type;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 px-4 flex-1">
        {/* Overdue Welcome Alert */}
        {membersNeedingWelcome.length > 0 && (
          <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Members Awaiting Welcome</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                {membersNeedingWelcome.length} member{membersNeedingWelcome.length !== 1 ? 's' : ''} joined 3+ days ago and haven't been welcomed yet.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                className="ml-4 shrink-0"
                onClick={() => navigate('/members?filter=needs_welcome')}
              >
                View Members
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Welcome back, Henry 👋
          </h1>
          <p className="text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Planned This Week</CardDescription>
              <CardTitle className="text-3xl">{plannedThisWeek}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {postedThisWeek} already posted
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today's Posts</CardDescription>
              <CardTitle className="text-3xl">{todaysPosts.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {todaysPosts.length > 0 ? 'Ready to share!' : 'No posts planned for today'}
              </div>
            </CardContent>
          </Card>

          {/* New Members This Week */}
          <Card className={newMembersThisWeek.length > 0 ? 'border-primary/30 bg-primary/5' : ''}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                New Members This Week
              </CardDescription>
              <CardTitle className="text-3xl">{newMembersThisWeek.length}</CardTitle>
            </CardHeader>
            <CardContent>
              {newMembersThisWeek.length > 0 ? (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={handleGenerateWelcomePost}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate welcome post
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No new members yet
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Quick Responses</CardDescription>
              <CardTitle className="text-3xl">{totalResponses}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Saved for quick replies
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Link to="/generate">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Generate New Post</h3>
                  <p className="text-sm text-muted-foreground">Create AI-powered content</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/responses">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Quick Responses</h3>
                  <p className="text-sm text-muted-foreground">Browse saved replies</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link to="/calendar">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Content Calendar</h3>
                  <p className="text-sm text-muted-foreground">Plan your schedule</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Posts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Today's Posts</CardTitle>
                <CardDescription>
                  {todaysPosts.length > 0 
                    ? `${todaysPosts.length} post${todaysPosts.length !== 1 ? 's' : ''} planned`
                    : 'Nothing scheduled for today'
                  }
                </CardDescription>
              </div>
              <Link to="/calendar">
                <Button variant="ghost" size="sm">
                  View Calendar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {todaysPosts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No posts scheduled for today</p>
                  <Link to="/generate">
                    <Button variant="link" size="sm" className="mt-2">
                      Generate a new post
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {todaysPosts.map(post => (
                    <div key={post.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm leading-snug">{post.title}</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => handleCopyPost(post)}
                        >
                          {copiedId === post.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {getTimeSlotLabel(post.time_slot)}
                        </span>
                        {post.post_type && (
                          <Badge variant="secondary" className="text-xs">
                            {getPostTypeLabel(post.post_type)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* This Week's Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">This Week</CardTitle>
                <CardDescription>
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weekDays.map(day => {
                  const dayPosts = thisWeeksPosts.filter(p => 
                    isSameDay(new Date(p.scheduled_date), day)
                  );
                  const plannedCount = dayPosts.filter(p => p.status === 'planned').length;
                  const postedCount = dayPosts.filter(p => p.status === 'posted').length;
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg",
                        isToday(day) && "bg-primary/5 border border-primary/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                          isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <span className={cn(
                          "text-sm",
                          isToday(day) && "font-medium"
                        )}>
                          {format(day, 'EEEE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plannedCount > 0 && (
                          <Badge variant="secondary">
                            {plannedCount} planned
                          </Badge>
                        )}
                        {postedCount > 0 && (
                          <Badge variant="outline">
                            {postedCount} posted
                          </Badge>
                        )}
                        {dayPosts.length === 0 && (
                          <span className="text-xs text-muted-foreground">No posts</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Outreach & Community Health */}
        <div className="grid gap-6 lg:grid-cols-2 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-4 w-4" />
                Outreach Progress
              </CardTitle>
              <CardDescription>This week's outreach activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Messages Sent</span>
                <span className="font-semibold">{stats.outreachSentThisWeek}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Response Rate</span>
                <span className="font-semibold">{stats.responseRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Queue Ready</span>
                <span className="font-semibold">{queueCount}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => navigate('/outreach')}>
                  View Log
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Community Health
              </CardTitle>
              <CardDescription>Member engagement snapshot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Members</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Never Engaged</span>
                <span className="font-semibold text-destructive">{stats.neverEngaged}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">At Risk</span>
                <span className="font-semibold">{stats.atRisk}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Inactive 30+</span>
                <span className="font-semibold">{stats.inactive}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recently Used Responses */}
        {recentlyUsed.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recently Used Responses</CardTitle>
                <CardDescription>Quick access to your most used replies</CardDescription>
              </div>
              <Link to="/responses">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recentlyUsed.map(response => (
                  <div 
                    key={response.id} 
                    className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{response.title}</h4>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {response.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {response.content}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}