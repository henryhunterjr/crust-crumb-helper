import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { Plus, Loader2, Copy, Check, CheckCircle, Edit, RefreshCw, Trash2, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useContentCampaigns, useCampaignPosts, useCampaignAnalytics, CampaignPost } from '@/hooks/useContentCampaigns';
import { useRecipes } from '@/hooks/useRecipes';
import { useClassroomResources } from '@/hooks/useClassroomResources';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EVENT_TYPES = [
  { value: 'bake_along', label: 'Saturday Bake-Along' },
  { value: 'challenge', label: 'Challenge Week' },
  { value: 'holiday', label: 'Holiday Bake' },
  { value: 'special', label: 'Special Event' },
];

const THEME_LABELS: Record<string, string> = {
  announcement: 'Announcement',
  education: 'Education',
  technique: 'Technique',
  ingredients: 'Ingredients',
  troubleshooting: 'Troubleshooting',
  final_prep: 'Final Prep',
  event_day: 'Event Day',
};

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  drafted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  posted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function Campaigns() {
  const { campaigns, isLoading, createCampaign, deleteCampaign } = useContentCampaigns();
  const { recipes } = useRecipes();
  const { resources } = useClassroomResources();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formEventType, setFormEventType] = useState('bake_along');
  const [formBreadName, setFormBreadName] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formPromotionDays, setFormPromotionDays] = useState(7);
  const [formNotes, setFormNotes] = useState('');

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error('Campaign title is required');
      return;
    }

    try {
      const result = await createCampaign.mutateAsync({
        title: formTitle,
        event_type: formEventType,
        bread_name: formBreadName || undefined,
        event_date: formEventDate || undefined,
        promotion_days: formPromotionDays,
      });

      setSelectedCampaignId(result.id);
      setCreateOpen(false);

      // Generate campaign posts
      setIsGenerating(true);
      toast.info('Generating campaign posts... This may take a minute.');

      const { data, error } = await supabase.functions.invoke('generate-campaign', {
        body: {
          bread_name: formBreadName,
          event_date: formEventDate,
          promotion_days: formPromotionDays,
          special_notes: formNotes,
          campaign_id: result.id,
        },
      });

      if (error) throw error;
      toast.success(`Campaign generated with ${data.count} posts!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate campaign');
    } finally {
      setIsGenerating(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormEventType('bake_along');
    setFormBreadName('');
    setFormEventDate('');
    setFormPromotionDays(7);
    setFormNotes('');
  };

  // Auto-fill title when bread name changes
  const handleBreadNameChange = (name: string) => {
    setFormBreadName(name);
    if (!formTitle || formTitle.includes('Bake-Along')) {
      setFormTitle(`${name} Bake-Along`);
    }
  };

  // Recipe suggestions
  const recipeSuggestions = formBreadName.length >= 2
    ? recipes.filter(r => r.title.toLowerCase().includes(formBreadName.toLowerCase())).slice(0, 5)
    : [];

  const activeCampaigns = campaigns.filter(c => c.status === 'active' || c.status === 'draft');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Content Campaigns</h1>
            <p className="text-muted-foreground">Plan and generate 7-day bake-along content sequences</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {isGenerating ? 'Generating...' : 'New Campaign'}
          </Button>
        </div>

        {selectedCampaignId && selectedCampaign ? (
          <CampaignTimeline
            campaign={selectedCampaign}
            onBack={() => setSelectedCampaignId(null)}
          />
        ) : (
          <div className="space-y-6">
            {activeCampaigns.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Active & Upcoming</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {activeCampaigns.map(c => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={() => setSelectedCampaignId(c.id)}
                      onDelete={() => deleteCampaign.mutate(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedCampaigns.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">Completed</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {completedCampaigns.map(c => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onClick={() => setSelectedCampaignId(c.id)}
                      onDelete={() => deleteCampaign.mutate(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {campaigns.length === 0 && !isLoading && (
              <div className="text-center py-16 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No campaigns yet</p>
                <p className="text-sm">Create your first bake-along campaign to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Create Campaign Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Create Bake-Along Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={formEventType} onValueChange={setFormEventType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    value={formEventDate}
                    onChange={e => setFormEventDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bread / Recipe</Label>
                <Input
                  value={formBreadName}
                  onChange={e => handleBreadNameChange(e.target.value)}
                  placeholder="e.g., Ligurian Focaccia"
                />
                {recipeSuggestions.length > 0 && (
                  <div className="border rounded-md p-1 space-y-0.5">
                    {recipeSuggestions.map(r => (
                      <button
                        key={r.id}
                        className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                        onClick={() => handleBreadNameChange(r.title)}
                      >
                        {r.title}
                        <span className="text-xs text-muted-foreground ml-2">{r.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Campaign Title</Label>
                <Input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ligurian Focaccia Bake-Along"
                />
              </div>

              <div className="space-y-2">
                <Label>Promotion Days</Label>
                <Select value={String(formPromotionDays)} onValueChange={v => setFormPromotionDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Special Notes (optional)</Label>
                <Textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g., This is a yeasted recipe, not sourdough. Emphasize the brine technique."
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createCampaign.isPending}>
                Generate {formPromotionDays * 2}-Post Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}

// Campaign card component
function CampaignCard({ campaign, onClick, onDelete }: {
  campaign: any;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{campaign.title}</CardTitle>
          <Badge variant="outline" className={cn(
            'text-xs',
            campaign.status === 'active' && 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            campaign.status === 'completed' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            campaign.status === 'draft' && 'bg-muted text-muted-foreground',
          )}>
            {campaign.status}
          </Badge>
        </div>
        <CardDescription>
          {campaign.bread_name && <span>{campaign.bread_name} · </span>}
          {campaign.event_date ? format(new Date(campaign.event_date + 'T12:00:00'), 'MMM d, yyyy') : 'No date set'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {EVENT_TYPES.find(t => t.value === campaign.event_type)?.label || campaign.event_type}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Campaign timeline view
function CampaignTimeline({ campaign, onBack }: { campaign: any; onBack: () => void }) {
  const { posts, isLoading, updatePost, markPostPosted } = useCampaignPosts(campaign.id);
  const { analytics, upsertAnalytics } = useCampaignAnalytics(campaign.id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<CampaignPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Analytics form
  const [participants, setParticipants] = useState(analytics?.estimated_participants || 0);
  const [photos, setPhotos] = useState(analytics?.photos_shared || 0);
  const [comments, setComments] = useState(analytics?.comments_count || 0);
  const [newMembers, setNewMembers] = useState(analytics?.new_members_during || 0);
  const [analyticsNotes, setAnalyticsNotes] = useState(analytics?.notes || '');

  const postedCount = posts.filter(p => p.status === 'posted').length;
  const totalPosts = posts.length;

  // Group posts by day
  const dayGroups = posts.reduce((acc, post) => {
    if (!acc[post.day_number]) acc[post.day_number] = [];
    acc[post.day_number].push(post);
    return acc;
  }, {} as Record<number, CampaignPost[]>);

  const handleCopy = async (post: CampaignPost) => {
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

  const handleCopyAndPost = async (post: CampaignPost) => {
    await handleCopy(post);
    window.open('https://www.skool.com/crust-crumb-academy-7621', '_blank');
    markPostPosted.mutate(post.id);
  };

  const handleEditSave = () => {
    if (!editingPost) return;
    updatePost.mutate({ id: editingPost.id, title: editTitle, content: editContent });
    setEditingPost(null);
  };

  const handleSaveAnalytics = () => {
    upsertAnalytics.mutate({
      campaign_id: campaign.id,
      estimated_participants: participants,
      photos_shared: photos,
      comments_count: comments,
      new_members_during: newMembers,
      notes: analyticsNotes,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
            ← Back to Campaigns
          </Button>
          <h2 className="text-xl font-bold">{campaign.title}</h2>
          <p className="text-sm text-muted-foreground">
            {campaign.bread_name} · {campaign.event_date ? format(new Date(campaign.event_date + 'T12:00:00'), 'MMM d, yyyy') : ''} · {postedCount}/{totalPosts} posted
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(!showAnalytics)}>
            <BarChart3 className="h-4 w-4 mr-1" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </Button>
        </div>
      </div>

      {/* Campaign Analytics */}
      {showAnalytics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Campaign Analytics</CardTitle>
            <CardDescription>Record engagement data after the event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1">
                <Label className="text-xs">Participants</Label>
                <Input type="number" value={participants} onChange={e => setParticipants(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Photos Shared</Label>
                <Input type="number" value={photos} onChange={e => setPhotos(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Comments</Label>
                <Input type="number" value={comments} onChange={e => setComments(Number(e.target.value))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Members</Label>
                <Input type="number" value={newMembers} onChange={e => setNewMembers(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Notes</Label>
              <Textarea value={analyticsNotes} onChange={e => setAnalyticsNotes(e.target.value)} placeholder="What worked? What to improve?" className="min-h-[60px]" />
            </div>
            <Button size="sm" className="mt-3" onClick={handleSaveAnalytics}>Save Analytics</Button>
          </CardContent>
        </Card>
      )}

      {/* Post Timeline */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading posts...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(dayGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([dayNum, dayPosts]) => {
            const theme = dayPosts[0]?.theme || '';
            return (
              <div key={dayNum}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Day {dayNum} — {THEME_LABELS[theme] || theme}
                  {dayPosts[0]?.scheduled_date && (
                    <span className="ml-2 font-normal normal-case">
                      {format(new Date(dayPosts[0].scheduled_date + 'T12:00:00'), 'EEEE, MMM d')}
                    </span>
                  )}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {dayPosts.map(post => (
                    <Card key={post.id} className={cn(post.status === 'posted' && 'opacity-60')}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {post.post_type === 'value' ? '📌' : '💬'} {post.time_slot}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {post.post_type === 'value' ? 'Value' : 'Engagement'}
                            </Badge>
                          </div>
                          <Badge variant="secondary" className={cn('text-xs', STATUS_STYLES[post.status])}>
                            {post.status === 'not_started' ? 'Not Started' : post.status === 'drafted' ? 'Draft' : 'Posted'}
                          </Badge>
                        </div>
                        <CardTitle className={cn('text-sm', post.status === 'posted' && 'line-through')}>
                          {post.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6 mb-3">
                          {post.content}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCopy(post)}>
                            {copiedId === post.id ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
                          </Button>
                          {post.status !== 'posted' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleCopyAndPost(post)}>
                              <CheckCircle className="h-3 w-3 mr-1" />Copy & Post
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                            setEditingPost(post);
                            setEditTitle(post.title);
                            setEditContent(post.content || '');
                          }}>
                            <Edit className="h-3 w-3 mr-1" />Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="min-h-[200px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
