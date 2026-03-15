import { useState, useMemo } from 'react';
import {
  format, addDays, addWeeks, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, getDay, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Copy, Check, CheckCircle, Sparkles, Edit, Loader2, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCalendarPosts, useCalendarTemplates, ScheduledPostSlot } from '@/hooks/useCalendarPosts';
import { PLATFORMS, CONTENT_PILLARS, FRAMEWORKS } from '@/types/postIdea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_CONFIG = [
  { time: '11:00', label: '11:00 AM', type: 'reel', icon: '🎬', typeLabel: 'Reel / TikTok', defaultPlatform: 'instagram' },
  { time: '12:30', label: '12:30 PM', type: 'value', icon: '📌', typeLabel: 'Skool Value', defaultPlatform: 'skool' },
  { time: '19:00', label: '7:00 PM', type: 'engagement', icon: '💬', typeLabel: 'Skool Engagement', defaultPlatform: 'skool' },
];

const PILLAR_BADGE_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  'why-it-works':          { bg: 'bg-blue-50 dark:bg-blue-950',   text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500',    label: 'Science' },
  'no-gatekeeping':        { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500',  label: 'No Gatekeeping' },
  'from-brick-to-beautiful': { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300',   dot: 'bg-green-500',   label: 'Transformation' },
  'bread-is-ritual':       { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500',  label: 'Ritual' },
};

const PLATFORM_CONFIG: Record<string, { label: string; icon: string; url: string; buttonLabel: string }> = {
  skool:     { label: 'Skool', icon: '🏫', url: 'https://www.skool.com/crust-crumb-academy-7621', buttonLabel: 'Copy & Open Skool' },
  instagram: { label: 'Instagram', icon: '📸', url: 'https://www.instagram.com', buttonLabel: 'Copy & Open Instagram' },
  tiktok:    { label: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com', buttonLabel: 'Copy & Open TikTok' },
};

function PillarBadge({ pillar }: { pillar?: string | null }) {
  if (!pillar || !PILLAR_BADGE_STYLES[pillar]) return null;
  const style = PILLAR_BADGE_STYLES[pillar];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", style.bg, style.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

function PlatformIcon({ platform }: { platform?: string | null }) {
  const cfg = PLATFORM_CONFIG[platform || 'skool'];
  return <span className="text-[10px]">{cfg?.icon}</span>;
}

export default function Calendar() {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { posts, isLoading, createPost, updatePost, markPosted } = useCalendarPosts();
  const { getTemplateForSlot } = useCalendarTemplates();

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
  const [editorCaption, setEditorCaption] = useState('');
  const [editorSourceMaterial, setEditorSourceMaterial] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    return posts.find(p =>
      isSameDay(new Date(p.scheduled_date), date) &&
      p.time_slot === slotTime
    );
  };

  // Stats
  const weekPosts = useMemo(() => posts.filter(p => {
    const d = new Date(p.scheduled_date);
    return d >= weekStart && d <= weekEnd;
  }), [posts, weekStart, weekEnd]);

  const stats = useMemo(() => {
    const scheduled = weekPosts.length;
    const completed = weekPosts.filter(p => p.status === 'posted').length;
    const reelCount = weekPosts.filter(p => {
      const plat = p.platform || 'skool';
      return plat === 'instagram' || plat === 'tiktok';
    }).length;
    const skoolCount = weekPosts.filter(p => (p.platform || 'skool') === 'skool').length;
    const totalSlots = 7 * 3;
    const emptySlots = totalSlots - scheduled;
    return { scheduled, completed, reelCount, skoolCount, emptySlots };
  }, [weekPosts]);

  const openEditor = (date: Date, slot: typeof SLOT_CONFIG[0], existingPost?: ScheduledPostSlot) => {
    setEditorDate(date);
    setEditorSlot(slot);
    if (existingPost) {
      setEditingPost(existingPost);
      setEditorTitle(existingPost.title);
      setEditorContent(existingPost.content);
      setEditorPlatform(existingPost.platform || slot.defaultPlatform);
      setEditorPillar(existingPost.content_pillar || '');
      setEditorFramework(existingPost.framework || '');
      setEditorHashtags(existingPost.hashtags || '');
      setEditorCaption(existingPost.caption || '');
      setEditorSourceMaterial(existingPost.source_material || '');
    } else {
      setEditingPost(null);
      setEditorTitle('');
      setEditorContent('');
      setEditorPlatform(slot.defaultPlatform);
      setEditorPillar('');
      setEditorFramework('');
      setEditorHashtags('');
      setEditorCaption('');
      setEditorSourceMaterial('');
      // Auto-fill from template
      const tmpl = getTemplateForSlot(date, slot.time);
      if (tmpl) {
        setEditorPillar(tmpl.content_pillar || '');
        setEditorFramework(tmpl.framework || '');
        setEditorSourceMaterial(tmpl.source_suggestion || '');
      }
    }
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editorDate || !editorSlot || !editorTitle.trim()) return;
    const dateStr = format(editorDate, 'yyyy-MM-dd');

    const fields = {
      platform: editorPlatform || editorSlot.defaultPlatform,
      content_pillar: editorPillar || null,
      framework: editorFramework || null,
      hashtags: editorHashtags || null,
      caption: editorCaption || null,
      source_material: editorSourceMaterial || null,
    };

    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, title: editorTitle, content: editorContent, ...fields });
    } else {
      createPost.mutate({
        title: editorTitle,
        content: editorContent,
        scheduled_date: dateStr,
        time_slot: editorSlot.time,
        post_type: editorSlot.type,
        status: 'planned',
        ...fields,
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
          postType: editorSlot.type === 'value' ? 'educational' : editorSlot.type === 'reel' ? 'educational' : 'community-building',
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
      const text = post.caption
        ? `${post.title}\n\n${post.content}\n\n---\nCaption:\n${post.caption}${post.hashtags ? '\n\n' + post.hashtags : ''}`
        : `${post.title}\n\n${post.content}`;
      await navigator.clipboard.writeText(text);
      setCopiedId(post.id);
      toast.success('Copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch { toast.error('Failed to copy'); }
  };

  const handleCopyAndPost = async (post: ScheduledPostSlot) => {
    await handleCopy(post);
    const platform = post.platform || 'skool';
    const cfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.skool;
    window.open(cfg.url, '_blank');
    markPosted.mutate(post.id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-6 px-4 flex-1">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Content Command Center</h1>
            <p className="text-muted-foreground text-sm">
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

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-[11px] text-muted-foreground">Scheduled This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-[11px] text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-pink-600">{stats.reelCount}</p>
              <p className="text-[11px] text-muted-foreground">📸🎵 Reels / TikTok</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.skoolCount}</p>
              <p className="text-[11px] text-muted-foreground">🏫 Skool Posts</p>
            </CardContent>
          </Card>
        </div>

        {/* WEEKLY VIEW */}
        {view === 'week' && (
          <div className="space-y-2">
            {weekDays.map(day => {
              const dayIdx = getDay(day);
              return (
                <div key={day.toISOString()} className={cn(
                  "rounded-lg border overflow-hidden",
                  isToday(day) && "ring-2 ring-primary/30"
                )}>
                  {/* Day header */}
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 border-b",
                    isToday(day) ? "bg-primary/5" : "bg-muted/30"
                  )}>
                    <span className={cn(
                      "text-sm font-semibold",
                      isToday(day) && "text-primary"
                    )}>
                      {DAY_NAMES_FULL[dayIdx]}
                    </span>
                    <span className="text-xs text-muted-foreground">{format(day, 'MMM d')}</span>
                    {isToday(day) && <Badge variant="default" className="text-[10px] h-4 px-1.5">Today</Badge>}
                  </div>

                  {/* Three slot columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                    {SLOT_CONFIG.map(slot => {
                      const post = getPostsForSlot(day, slot.time);
                      const template = getTemplateForSlot(day, slot.time);

                      if (post) {
                        const postPlatform = post.platform || slot.defaultPlatform;
                        const platformCfg = PLATFORM_CONFIG[postPlatform] || PLATFORM_CONFIG.skool;
                        return (
                          <div key={slot.time} className={cn(
                            "p-3 text-xs min-h-[120px]",
                            post.status === 'posted'
                              ? "bg-green-50/50 dark:bg-green-950/20"
                              : "bg-card"
                          )}>
                            {/* Slot header */}
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{slot.icon}</span>
                                <span className="font-medium text-[11px]">{slot.label}</span>
                                <PlatformIcon platform={postPlatform} />
                              </div>
                              <Badge variant="outline" className={cn("text-[10px] h-4",
                                post.status === 'posted'
                                  ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700"
                                  : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-700"
                              )}>
                                {post.status === 'posted' ? '✓ Posted' : '⏳ Draft'}
                              </Badge>
                            </div>

                            {/* Title */}
                            <p className={cn("font-semibold text-[12px] mb-1 line-clamp-1", post.status === 'posted' && "line-through opacity-60")}>
                              {post.title}
                            </p>

                            {/* Pillar badge */}
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              <PillarBadge pillar={post.content_pillar} />
                              {post.framework && (
                                <span className="text-[10px] text-muted-foreground italic">{post.framework}</span>
                              )}
                            </div>

                            {/* Caption preview */}
                            {post.caption && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5 italic border-l-2 border-muted pl-2">
                                {post.caption}
                              </p>
                            )}

                            {/* Hashtags */}
                            {post.hashtags && (
                              <p className="text-[10px] text-blue-500 dark:text-blue-400 line-clamp-1 mb-1.5">{post.hashtags}</p>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-1 mt-auto pt-1">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => openEditor(day, slot, post)}>
                                <Edit className="h-2.5 w-2.5 mr-0.5" />Edit
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleCopy(post)}>
                                {copiedId === post.id ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                              </Button>
                              {post.status !== 'posted' && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleCopyAndPost(post)}>
                                  <ExternalLink className="h-2.5 w-2.5 mr-0.5" />{platformCfg.buttonLabel.replace('Copy & ', '')}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      // EMPTY SLOT — show suggestion
                      return (
                        <div
                          key={slot.time}
                          className="p-3 text-xs min-h-[120px] border-dashed cursor-pointer hover:bg-accent/20 transition-colors"
                          onClick={() => openEditor(day, slot)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm opacity-50">{slot.icon}</span>
                              <span className="font-medium text-[11px] text-muted-foreground">{slot.label}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-4 bg-destructive/5 text-destructive/60 border-destructive/20">
                              Empty
                            </Badge>
                          </div>

                          {template && (
                            <div className="bg-muted/40 rounded p-2 mb-2 border border-dashed border-muted-foreground/20">
                              <PillarBadge pillar={template.content_pillar} />
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                💡 {template.template_text}
                              </p>
                              {template.source_suggestion && (
                                <p className="text-[10px] text-muted-foreground/70 mt-1">📚 {template.source_suggestion}</p>
                              )}
                            </div>
                          )}

                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-muted-foreground">
                            <Plus className="h-2.5 w-2.5 mr-0.5" />Draft
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTH VIEW */}
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
                  const slot1 = getPostsForSlot(day, '11:00');
                  const slot2 = getPostsForSlot(day, '12:30');
                  const slot3 = getPostsForSlot(day, '19:00');

                  const getDot = (post?: ScheduledPostSlot) => {
                    if (!post) return 'bg-destructive/30';
                    if (post.status === 'posted') return 'bg-green-500';
                    return 'bg-amber-400';
                  };

                  return (
                    <div
                      key={i}
                      className={cn(
                        "aspect-square p-1 rounded cursor-pointer hover:bg-accent/50 transition-colors flex flex-col items-center justify-center gap-0.5",
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
                        <div className={cn("h-1.5 w-1.5 rounded-full", getDot(slot1))} title="11:00 Reel" />
                        <div className={cn("h-1.5 w-1.5 rounded-full", getDot(slot2))} title="12:30 Value" />
                        <div className={cn("h-1.5 w-1.5 rounded-full", getDot(slot3))} title="7:00 Engage" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground justify-center">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Posted</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Drafted</span>
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
              {/* Template hint */}
              {!editingPost && editorDate && editorSlot && (() => {
                const tmpl = getTemplateForSlot(editorDate, editorSlot.time);
                return tmpl ? (
                  <div className="bg-muted/50 rounded-md p-3 text-sm border border-dashed border-muted-foreground/20">
                    <span className="font-medium">💡 Suggestion:</span> {tmpl.template_text}
                    {tmpl.source_suggestion && (
                      <p className="text-xs text-muted-foreground mt-1">📚 Source: {tmpl.source_suggestion}</p>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Platform / Pillar / Framework */}
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
                      <SelectValue placeholder="Select" />
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

              {/* Title */}
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={editorTitle} onChange={e => setEditorTitle(e.target.value)} placeholder="Post title" />
              </div>

              {/* Content */}
              <div className="space-y-1">
                <Label className="text-xs">Content</Label>
                <Textarea value={editorContent} onChange={e => setEditorContent(e.target.value)} className="min-h-[140px]" placeholder="Write your post content..." />
              </div>

              {/* Caption — for Instagram/TikTok */}
              {editorPlatform !== 'skool' && (
                <div className="space-y-1">
                  <Label className="text-xs">Caption (for {editorPlatform === 'instagram' ? 'Instagram' : 'TikTok'})</Label>
                  <Textarea value={editorCaption} onChange={e => setEditorCaption(e.target.value)} className="min-h-[60px] text-xs" placeholder="Write caption for social media..." />
                </div>
              )}

              {/* Hashtags — for Instagram/TikTok */}
              {editorPlatform !== 'skool' && (
                <div className="space-y-1">
                  <Label className="text-xs">Hashtags</Label>
                  <Input value={editorHashtags} onChange={e => setEditorHashtags(e.target.value)} placeholder="#sourdough #breadbaking #homemade" className="text-xs" />
                </div>
              )}

              {/* Source Material */}
              <div className="space-y-1">
                <Label className="text-xs">Source Material</Label>
                <Input value={editorSourceMaterial} onChange={e => setEditorSourceMaterial(e.target.value)} placeholder="Course module, recipe, or reference" className="text-xs" />
              </div>

              {/* Action buttons */}
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
                        <ExternalLink className="h-4 w-4 mr-1" />
                        {PLATFORM_CONFIG[editorPlatform]?.buttonLabel || 'Copy & Post'}
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
