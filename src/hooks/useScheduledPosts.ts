import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledPost } from '@/types/postIdea';
import { toast } from 'sonner';

export function useScheduledPosts() {
  const queryClient = useQueryClient();

  const { data: scheduledPosts = [], isLoading } = useQuery({
    queryKey: ['scheduled-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .order('scheduled_date', { ascending: true });
      
      if (error) throw error;
      return data as ScheduledPost[];
    },
  });

  const createScheduledPost = useMutation({
    mutationFn: async (post: {
      title: string;
      content: string;
      scheduled_date: string;
      time_slot?: string;
      post_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          title: post.title,
          content: post.content,
          scheduled_date: post.scheduled_date,
          time_slot: post.time_slot || null,
          post_type: post.post_type || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post scheduled!');
    },
    onError: (error) => {
      toast.error('Failed to schedule post: ' + error.message);
    },
  });

  const updateScheduledPost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledPost> & { id: string }) => {
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
    onError: (error) => {
      toast.error('Failed to update post: ' + error.message);
    },
  });

  const reschedulePost = useMutation({
    mutationFn: async ({ id, scheduled_date }: { id: string; scheduled_date: string }) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .update({ scheduled_date })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post rescheduled!');
    },
    onError: (error) => {
      toast.error('Failed to reschedule: ' + error.message);
    },
  });

  const deleteScheduledPost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Scheduled post deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const markAsPosted = useMutation({
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

  return {
    scheduledPosts,
    isLoading,
    createScheduledPost,
    updateScheduledPost,
    reschedulePost,
    deleteScheduledPost,
    markAsPosted,
  };
}
