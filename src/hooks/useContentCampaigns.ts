import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContentCampaign {
  id: string;
  title: string;
  event_type: string;
  bread_name: string | null;
  event_date: string | null;
  promotion_days: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignPost {
  id: string;
  campaign_id: string;
  day_number: number;
  time_slot: string;
  post_type: string;
  theme: string | null;
  title: string;
  content: string | null;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
}

export function useContentCampaigns() {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['content-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ContentCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (campaign: {
      title: string;
      event_type: string;
      bread_name?: string;
      event_date?: string;
      promotion_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('content_campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data as ContentCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-campaigns'] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContentCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('content_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('content_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-campaigns'] });
      toast.success('Campaign deleted');
    },
  });

  return { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign };
}

export function useCampaignPosts(campaignId: string | null) {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['campaign-posts', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('day_number')
        .order('time_slot');
      if (error) throw error;
      return data as CampaignPost[];
    },
    enabled: !!campaignId,
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CampaignPost> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaign_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-posts', campaignId] });
    },
  });

  const markPostPosted = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaign_posts')
        .update({ status: 'posted' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-posts', campaignId] });
      toast.success('Marked as posted!');
    },
  });

  const saveBulkPosts = useMutation({
    mutationFn: async (newPosts: Array<{
      campaign_id: string;
      day_number: number;
      time_slot: string;
      post_type: string;
      theme: string;
      title: string;
      content: string;
      status: string;
      scheduled_date: string;
    }>) => {
      const { data, error } = await supabase
        .from('campaign_posts')
        .insert(newPosts)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-posts', campaignId] });
    },
  });

  return { posts, isLoading, updatePost, markPostPosted, saveBulkPosts };
}

export function useCampaignAnalytics(campaignId: string | null) {
  const queryClient = useQueryClient();

  const { data: analytics } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaign_analytics')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  const upsertAnalytics = useMutation({
    mutationFn: async (input: {
      campaign_id: string;
      estimated_participants?: number;
      photos_shared?: number;
      comments_count?: number;
      new_members_during?: number;
      notes?: string;
    }) => {
      // Check if exists
      const { data: existing } = await supabase
        .from('campaign_analytics')
        .select('id')
        .eq('campaign_id', input.campaign_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('campaign_analytics')
          .update(input)
          .eq('campaign_id', input.campaign_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('campaign_analytics')
          .insert(input)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-analytics', campaignId] });
      toast.success('Analytics saved');
    },
  });

  return { analytics, upsertAnalytics };
}
