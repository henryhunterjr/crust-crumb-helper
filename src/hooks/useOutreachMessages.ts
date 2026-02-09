import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OutreachMessage } from '@/types/outreachMessage';

interface SaveMessageInput {
  member_id: string;
  member_name: string;
  message_type: string;
  message_text: string;
  custom_topic?: string | null;
}

export function useOutreachMessages(memberId?: string) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['outreach-messages', memberId],
    queryFn: async () => {
      let query = supabase
        .from('outreach_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OutreachMessage[];
    },
  });

  const saveMessage = useMutation({
    mutationFn: async (input: SaveMessageInput) => {
      const { data, error } = await supabase
        .from('outreach_messages')
        .insert({
          member_id: input.member_id,
          member_name: input.member_name,
          message_type: input.message_type,
          message_text: input.message_text,
          custom_topic: input.custom_topic || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as OutreachMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-messages'] });
    },
  });

  const updateMessageStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('outreach_messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as OutreachMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-messages'] });
    },
  });

  return { messages, isLoading, saveMessage, updateMessageStatus };
}
