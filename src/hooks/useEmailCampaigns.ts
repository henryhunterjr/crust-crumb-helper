import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailSubscriber {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  source: string | null;
  is_skool_member: boolean;
  matched_member_id: string | null;
  subscription_time: string | null;
  confirmation_time: string | null;
  list_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string;
  target_segment: string;
  status: string;
  email_count: number;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export interface EmailDraft {
  id: string;
  campaign_id: string;
  subscriber_id: string | null;
  member_id: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body_text: string;
  status: string;
  personalization_data: any;
  created_at: string;
  updated_at: string;
}

export function useEmailSubscribers() {
  return useQuery({
    queryKey: ['email-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailSubscriber[];
    },
  });
}

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    },
  });
}

export function useEmailDrafts(campaignId: string | null) {
  return useQuery({
    queryKey: ['email-drafts', campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_drafts')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as EmailDraft[];
    },
  });
}

export function useImportSubscribers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscribers: Omit<EmailSubscriber, 'id' | 'created_at' | 'updated_at' | 'is_skool_member' | 'matched_member_id'>[]) => {
      const { data, error } = await supabase
        .from('email_subscribers')
        .upsert(
          subscribers.map(s => ({
            email: s.email,
            first_name: s.first_name,
            last_name: s.last_name,
            status: s.status,
            source: s.source,
            subscription_time: s.subscription_time,
            confirmation_time: s.confirmation_time,
            list_name: s.list_name,
          })),
          { onConflict: 'email', ignoreDuplicates: false }
        )
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
      toast.success(`Imported ${data?.length || 0} subscribers`);
    },
    onError: (error) => {
      toast.error('Import failed: ' + error.message);
    },
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaign: { campaign_name: string; campaign_type: string; target_segment: string; email_count: number }) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert(campaign)
        .select()
        .single();
      if (error) throw error;
      return data as EmailCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailCampaign> & { id: string }) => {
      const { error } = await supabase.from('email_campaigns').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });
}

export function useSaveEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: Omit<EmailDraft, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('email_drafts')
        .insert(draft)
        .select()
        .single();
      if (error) throw error;
      return data as EmailDraft;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

export function useUpdateEmailDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailDraft> & { id: string }) => {
      const { error } = await supabase.from('email_drafts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

export function useBulkUpdateDraftStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from('email_drafts')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-drafts'] });
    },
  });
}

export function useLinkSubscriberToMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriberId, memberId }: { subscriberId: string; memberId: string | null }) => {
      const { error } = await supabase
        .from('email_subscribers')
        .update({
          is_skool_member: memberId !== null,
          matched_member_id: memberId,
        })
        .eq('id', subscriberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-subscribers'] });
    },
  });
}
