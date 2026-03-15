import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, getWeek, getDay } from 'date-fns';

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
    return templates.find(
      t => t.week_number === weekNum && t.day_of_week === dayOfWeek && t.slot_time === slotTime
    );
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
