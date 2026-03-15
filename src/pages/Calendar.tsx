import { useState, useMemo } from 'react';
import {
  format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, getDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Copy, Check, CheckCircle, Sparkles, Edit, Loader2, Filter } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarPosts, useCalendarTemplates, ScheduledPostSlot } from '@/hooks/useCalendarPosts';
import { PLATFORMS, CONTENT_PILLARS, FRAMEWORKS } from '@/types/postIdea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_CONFIG = [
  { time: '12:30', label: '12:30 PM', type: 'value', icon: '📌', typeLabel: 'Value' },
  { time: '19:00', label: '7:00 PM', type: 'engagement', icon: '💬', typeLabel: 'Engagement' },
];

const PLATFORM_COLORS: Record<string, string> = {
  skool: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  instagram: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  tiktok: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const PILLAR_COLORS: Record<string, string> = {
  'why-it-works': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'no-gatekeeping': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'from-brick-to-beautiful': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  'bread-is-ritual': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function Calendar() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { posts, isLoading, createPost, updatePost, markPosted } = useCalendarPosts();
  const { getTemplateForSlot } = useCalendarTemplates();

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPostSlot | null>(null);
  const [editorDate, setEditorDate] = useState<Date | null>(null);
  const [editorSlot, setEditorSlot] = useState<typeof SLOT_CONFIG[0] | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorPlatform, setEditorPlatform] = useState('skool');
  const [editorPillar, setEditorPillar] = useState('');
  const [editorFramework, setEditorFramework] = useState('');
  const [editorHashtags, setEditorHashtags] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter(p => {
      if (platformFilter !== 'all' && (p.platform || 'skool') !== platformFilter) return false;
      if (pillarFilter !== 'all' && p.content_pillar !== pillarFilter) return false;
      return true;
    });
  }, [posts, platformFilter, pillarFilter]);

  // Week boundaries
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Month boundaries
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getPostsForSlot = (date: Date, slotTime: string): ScheduledPostSlot | undefined => {
    return filteredPosts.find(p =>
      isSameDay(new Date(p.scheduled_date), date) &&
      p.time_slot === slotTime
    );
  };

  // Stats for header
  const weekPosts = filteredPosts.filter(p => {
    const d = new Date(p.scheduled_date);
    return d >= weekStart && d <= weekEnd;
  });
  const draftedCount = weekPosts.filter(p => p.status === 'planned').length;
  const postedCount = weekPosts.filter(p => p.status === 'posted').length;
  const emptySlots = 14 - weekPosts.length;

  const openEditor = (date: Date, slot: typeof SLOT_CONFIG[0], existingPost?: ScheduledPostSlot) => {
    setEditorDate(date);
    setEditorSlot(slot);
    if (existingPost) {
      setEditingPost(existingPost);
      setEditorTitle(existingPost.title);
      setEditorContent(existingPost.content);
      setEditorPlatform(existingPost.platform || 'skool');
      setEditorPillar(existingPost.content_pillar || '');
      setEditorFramework(existingPost.framework || '');
      setEditorHashtags(existingPost.hashtags || '');
    } else {
      setEditingPost(null);
      setEditorTitle('');
      setEditorContent('');
      setEditorPlatform(platformFilter !== 'all' ? platformFilter : 'skool');
      setEditorPillar(pillarFilter !== 'all' ? pillarFilter : '');
      setEditorFramework('');
      setEditorHashtags('');
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editorDate || !editorSlot || !editorTitle.trim()) return;
    const dateStr = format(editorDate, 'yyyy-MM-dd');

    const extra = {
      platform: editorPlatform || 'skool',
      content_pillar: editorPillar || null,
      framework: editorFramework || null,
      hashtags: editorHashtags || null,
    };

    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, title: editorTitle, content: editorContent, ...extra });
    } else {
      createPost.mutate({
        title: editorTitle,
        content: editorContent,
        scheduled_date: dateStr,
        time_slot: editorSlot.time,
        post_type: editorSlot.type,
        status: 'planned',
        ...extra,
      });
    }
    setEditorOpen(false);
  };

  const handleAIGenerate = async () => {
    if (!editorDate || !editorSlot) return;
    const template = getTemplateForSlot(editorDate, editorSlot.time);
    const suggestion = template?.template_text || `${editorSlot.typeLabel} post for ${format(editorDate, 'EEEE')}`;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-post', {
        body: {
          topic: suggestion,
          postType: editorSlot.type === 'value' ? 'educational' : 'community-building',
          targetAudience: 'all-members',
        },
      });
      if (error) throw error;
      const post = data.posts?.[0] || data;
      setEditorTitle(post.title || suggestion);
      setEditorContent(post.content || '');
      toast.success('Content generated!');
    } catch (err: any) {
      toast.error('Generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (post: ScheduledPostSlot) => {
    try {
      await navigator.clipboard.writeText(`${post.title}\n\n${post.content}`);
      setCopiedId(post.id);
      toast.success('Copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  const handleCopyAndPost = async (post: ScheduledPostSlot) => {
    await handleCopy(post);
    window.open('https://www.skool.com/crust-crumb-academy-7621', '_blank');
    markPosted.mutate(post.id);
  };

  const getPlatformLabel = (platform?: string | null) => {
    return PLATFORMS.find(p => p.value === (platform || 'skool'))?.label || '🏫 Skool';
  };

  const getPillarLabel = (pillar?: string | null) => {
    return CONTENT_PILLARS.find(p => p.value === pillar)?.label || null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-6 px-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Content Calendar</h1>
            <p className="text-muted-foreground">
              {view === 'week'
                ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'month')}>
              <TabsList className="h-8">
                <TabsTrigger value="week" className="text-xs px-3 h-7">Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3 h-7">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(view === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(view === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Platform & Pillar Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-accent/30 rounded-lg border">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground">Platform:</Label>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-muted-foreground">Pillar:</Label>
            <Select value={pillarFilter} onValueChange={setPillarFilter}>
              <SelectTrigger className="h-7 w-[200px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {CONTENT_PILLARS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(platformFilter !== 'all' || pillarFilter !== 'all') && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPlatformFilter('all'); setPillarFilter('all'); }}>
              Clear filters
            </Button>
          )}
        </div>

        {view === 'week' && (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              {draftedCount} drafted · {postedCount} posted · {emptySlots} empty
              {platformFilter !== 'all' && ` · Showing: ${getPlatformLabel(platformFilter)}`}
            </div>

            {/* Weekly Grid */}
            <div className="space-y-1">
              {weekDays.map(day => {
                const dayIdx = getDay(day);
                return (
                  <div key={day.toISOString()} className={cn(
                    "grid grid-cols-[120px_1fr_1fr] gap-2 p-2 rounded-lg border",
                    isToday(day) && "bg-primary/5 border-primary/20"
                  )}>
                    {/* Day label */}
                    <div className="flex flex-col justify-center">
                      <span className={cn("text-sm font-medium", isToday(day) && "text-primary")}>
                        {DAY_NAMES_FULL[dayIdx]}
                      </span>
                      <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                    </div>

                    {/* Slots */}
                    {SLOT_CONFIG.map(slot => {
                      const post = getPostsForSlot(day, slot.time);
                      const template = getTemplateForSlot(day, slot.time);

                      if (post) {
                        return (
                          <div key={slot.time} className={cn(
                            "border rounded-md p-2 text-xs",
                            post.status === 'posted'
                              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 opacity-70"
                              : "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{slot.icon} {slot.label}</span>
                              <Badge variant="outline" className={cn("text-[10px] h-4",
                                post.status === 'posted' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              )}>
                                {post.status === 'posted' ? '✓ Posted' : '⏳ Draft'}
                              </Badge>
                            </div>
                            <p className={cn("font-medium mb-1 line-clamp-1", post.status === 'posted' && "line-through")}>
                              {post.title}
                            </p>
                            {/* Platform & Pillar badges */}
                            <div className="flex flex-wrap gap-1 mb-1">
                              {post.platform && post.platform !== 'skool' && (
                                <Badge variant="secondary" className={cn("text-[9px] h-3.5", PLATFORM_COLORS[post.platform])}>
                                  {getPlatformLabel(post.platform)}
                                </Badge>
                              )}
                              {post.content_pillar && (
                                <Badge variant="secondary" className={cn("text-[9px] h-3.5", PILLAR_COLORS[post.content_pillar])}>
                                  {post.content_pillar}
                                </Badge>
                              )}
                              {post.campaign_id && (
                                <Badge variant="secondary" className="text-[9px] h-3.5">Campaign</Badge>
                              )}
                            </div>
                            <div className="flex gap-1 mt-1">
                              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => openEditor(day, slot, post)}>
                                <Edit className="h-2.5 w-2.5 mr-0.5" />View
                              </Button>
                              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => handleCopy(post)}>
                                {copiedId === post.id ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              </Button>
                              {post.status !== 'posted' && (
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => handleCopyAndPost(post)}>
                                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Post
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // Empty slot with template suggestion
                      return (
                        <div key={slot.time} className="border border-dashed rounded-md p-2 text-xs text-muted-foreground hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer"
                          onClick={() => openEditor(day, slot)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span>{slot.icon} {slot.label}</span>
                            <Badge variant="outline" className="text-[10px] h-4 bg-destructive/10 text-destructive border-destructive/20">Empty</Badge>
                          </div>
                          {template && (
                            <>
                              <p className="text-[11px] italic line-clamp-2">💡 {template.template_text}</p>
                              {template.platform && template.platform !== 'skool' && (
                                <Badge variant="outline" className={cn("text-[9px] h-3.5 mt-1", PLATFORM_COLORS[template.platform])}>
                                  {getPlatformLabel(template.platform)}
                                </Badge>
                              )}
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 mt-1">
                            <Plus className="h-2.5 w-2.5 mr-0.5" />Draft Post
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'month' && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const slot1 = getPostsForSlot(day, '12:30');
                  const slot2 = getPostsForSlot(day, '19:00');

                  const getDot = (post?: ScheduledPostSlot) => {
                    if (!post) return 'bg-destructive/30';
                    if (post.status === 'posted') return 'bg-green-500';
                    return 'bg-yellow-500';
                  };

                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square p-1 rounded cursor-pointer hover:bg-accent/50 transition-colors flex flex-col items-center justify-center gap-1",
                        !isCurrentMonth && "opacity-30",
                        isToday(day) && "bg-primary/10 ring-1 ring-primary/30"
                      )}
                      onClick={() => {
                        setCurrentDate(day);
                        setView('week');
                      }}
                    >
                      <span className={cn("text-xs font-medium", isToday(day) && "text-primary")}>
                        {format(day, 'd')}
                      </span>
                      <div className="flex gap-0.5">
                        <div className={cn("h-2 w-2 rounded-full", getDot(slot1))} />
                        <div className={cn("h-2 w-2 rounded-full", getDot(slot2))} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Posted</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500 inline-block" /> Drafted</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive/30 inline-block" /> Empty</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Post Editor Dialog */}
        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? 'Edit Post' : 'Draft Post'}
              </DialogTitle>
              {editorDate && editorSlot && (
                <p className="text-sm text-muted-foreground">
                  {format(editorDate, 'EEEE, MMM d')} — {editorSlot.label} ({editorSlot.typeLabel})
                </p>
              )}
            </DialogHeader>
            <div className="space-y-4 py-2">
              {!editingPost && editorDate && editorSlot && (() => {
                const tmpl = getTemplateForSlot(editorDate, editorSlot.time);
                return tmpl ? (
                  <div className="bg-accent/50 rounded-md p-3 text-sm">
                    <span className="font-medium">💡 Template suggestion:</span> {tmpl.template_text}
                    {tmpl.source_suggestion && (
                      <p className="text-xs text-muted-foreground mt-1">📚 Source: {tmpl.source_suggestion}</p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Platform, Pillar, Framework row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Platform</Label>
                  <Select value={editorPlatform} onValueChange={setEditorPlatform}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content Pillar</Label>
                  <Select value={editorPillar || 'none'} onValueChange={v => setEditorPillar(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {CONTENT_PILLARS.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Framework</Label>
                  <Select value={editorFramework || 'none'} onValueChange={v => setEditorFramework(v === 'none' ? '' : v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {FRAMEWORKS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={editorTitle} onChange={e => setEditorTitle(e.target.value)} placeholder="Post title" />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={editorContent} onChange={e => setEditorContent(e.target.value)} className="min-h-[180px]" placeholder="Write your post content..." />
              </div>

              {/* Hashtags for Instagram/TikTok */}
              {editorPlatform !== 'skool' && (
                <div className="space-y-2">
                  <Label className="text-xs">Hashtags</Label>
                  <Input value={editorHashtags} onChange={e => setEditorHashtags(e.target.value)} placeholder="#sourdough #breadbaking #homemade" className="text-xs" />
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAIGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  AI Generate
                </Button>
                {editingPost && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleCopy(editingPost)}>
                      <Copy className="h-4 w-4 mr-1" />Copy
                    </Button>
                    {editingPost.status !== 'posted' && (
                      <Button variant="outline" size="sm" onClick={() => { handleCopyAndPost(editingPost); setEditorOpen(false); }}>
                        <CheckCircle className="h-4 w-4 mr-1" />Copy & Post
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!editorTitle.trim()}>
                {editingPost ? 'Update' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
      <Footer />
    </div>
  );
}
