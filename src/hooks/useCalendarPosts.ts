import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDay } from 'date-fns';

export interface CalendarTemplate {
  id: string;
  week_number: number;
  day_of_week: number;
  slot_time: string;
  slot_type: string;
  template_text: string;
  platform?: string;
  content_pillar?: string;
  framework?: string;
  source_suggestion?: string;
}

export interface ScheduledPostSlot {
  id: string;
  scheduled_date: string;
  time_slot: string | null;
  post_type: string | null;
  title: string;
  content: string;
  status: string | null;
  posted_at: string | null;
  campaign_id: string | null;
  day_theme: string | null;
  platform?: string | null;
  content_pillar?: string | null;
  framework?: string | null;
  source_material?: string | null;
  hashtags?: string | null;
  caption?: string | null;
}

// Fallback suggestions when no DB template exists
const FALLBACK_SUGGESTIONS: Record<string, Record<number, { text: string; pillar?: string; framework?: string }>> = {
  '11:00': {
    1: { text: 'Science / Quick Tip — Clip from Reading Fermentation or Cold Kitchen module', pillar: 'why-it-works', framework: 'quick-tip' },
    2: { text: 'No Gatekeeping / Myth Buster — Talking head: debunk equipment myth', pillar: 'no-gatekeeping', framework: 'myth-buster' },
    3: { text: 'Transformation / Before & After — Member spotlight or your brick loaf story', pillar: 'from-brick-to-beautiful', framework: 'before-after' },
    4: { text: 'Science / Process Demo — Hands-on clip: folding, shaping, scoring', pillar: 'why-it-works', framework: 'quick-tip' },
    5: { text: 'Bread Is Ritual — Saturday bake-along teaser or Breaking Bread podcast clip', pillar: 'bread-is-ritual', framework: 'saturday-teaser' },
  },
  '12:30': {
    1: { text: 'Teaching post — one technique explained' },
    2: { text: 'Value post — recipe share or course highlight' },
    3: { text: 'Value post — community win or progress showcase' },
    4: { text: 'Value post — troubleshooting guide' },
    5: { text: 'Value post — weekend bake prep or ingredient spotlight' },
    6: { text: 'Saturday bake-along recipe and instructions' },
    0: { text: 'Sunday reflection or weekly round-up' },
  },
  '19:00': {
    1: { text: 'Engagement post — question or poll' },
    2: { text: 'Engagement post — "what are you baking this week?"' },
    3: { text: 'Engagement post — fill in the blank or this-or-that' },
    4: { text: 'Engagement post — unpopular opinion or hot take' },
    5: { text: 'Engagement post — share your weekend baking plans' },
    6: { text: 'Engagement post — show us your Saturday bake results' },
    0: { text: 'Engagement post — Sunday Q&A thread' },
  },
};

export function useCalendarTemplates() {
  const { data: templates = [] } = useQuery({
    queryKey: ['calendar-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_templates')
        .select('*')
        .order('week_number')
        .order('day_of_week')
        .order('slot_time');
      if (error) throw error;
      return data as CalendarTemplate[];
    },
  });

  const getTemplateForSlot = (date: Date, slotTime: string): CalendarTemplate | undefined => {
    const weekOfMonth = Math.ceil(date.getDate() / 7);
    const weekNum = ((weekOfMonth - 1) % 4) + 1;
    const dayOfWeek = getDay(date);

    // Try to find a DB template first
    const dbTemplate = templates.find(
      t => t.week_number === weekNum && t.day_of_week === dayOfWeek && t.slot_time === slotTime
    );
    if (dbTemplate) return dbTemplate;

    // Fall back to hardcoded suggestions
    const fallback = FALLBACK_SUGGESTIONS[slotTime]?.[dayOfWeek];
    if (fallback) {
      return {
        id: `fallback-${slotTime}-${dayOfWeek}-${weekNum}`,
        week_number: weekNum,
        day_of_week: dayOfWeek,
        slot_time: slotTime,
        slot_type: slotTime === '11:00' ? 'reel' : slotTime === '12:30' ? 'value' : 'engagement',
        template_text: fallback.text,
        platform: slotTime === '11:00' ? 'instagram' : 'skool',
        content_pillar: fallback.pillar,
        framework: fallback.framework,
      };
    }

    return undefined;
  };

  return { templates, getTemplateForSlot };
}

export function useCalendarPosts() {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['scheduled-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data as ScheduledPostSlot[];
    },
  });

  const createPost = useMutation({
    mutationFn: async (post: {
      title: string;
      content: string;
      scheduled_date: string;
      time_slot?: string;
      post_type?: string;
      status?: string;
      platform?: string;
      content_pillar?: string | null;
      framework?: string | null;
      hashtags?: string | null;
      caption?: string | null;
      source_material?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          title: post.title,
          content: post.content,
          scheduled_date: post.scheduled_date,
          time_slot: post.time_slot || null,
          post_type: post.post_type || null,
          status: post.status || 'planned',
          platform: post.platform || 'skool',
          content_pillar: post.content_pillar || null,
          framework: post.framework || null,
          hashtags: post.hashtags || null,
          caption: post.caption || null,
          source_material: post.source_material || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post created!');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledPostSlot> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post updated!');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post deleted');
    },
  });

  const markPosted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ status: 'posted', posted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Marked as posted!');
    },
  });

  return { posts, isLoading, createPost, updatePost, deletePost, markPosted };
}
