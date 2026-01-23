import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member, EngagementStatus, MemberImportRow } from '@/types/member';
import { differenceInDays, parseISO } from 'date-fns';

export function useMembers() {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Member[];
    },
  });

  const importMembers = useMutation({
    mutationFn: async (rows: MemberImportRow[]) => {
      const today = new Date();
      
      const membersToInsert = rows.map(row => {
        const joinDate = row.joinDate ? parseISO(row.joinDate) : null;
        const lastActive = row.lastActive ? parseISO(row.lastActive) : null;
        const postCount = row.posts || 0;
        const commentCount = row.comments || 0;
        
        // Calculate engagement status
        let engagementStatus: EngagementStatus = 'unknown';
        
        if (joinDate && postCount === 0 && commentCount === 0) {
          const daysSinceJoin = differenceInDays(today, joinDate);
          if (daysSinceJoin > 7) {
            engagementStatus = 'never_engaged';
          }
        } else if (lastActive) {
          const daysSinceActive = differenceInDays(today, lastActive);
          if (daysSinceActive <= 7) {
            engagementStatus = 'active';
          } else if (daysSinceActive > 30) {
            engagementStatus = 'inactive';
          } else if (daysSinceActive > 14 && (postCount > 0 || commentCount > 0)) {
            engagementStatus = 'at_risk';
          }
        }
        
        return {
          skool_name: row.name,
          email: row.email || null,
          join_date: row.joinDate || null,
          application_answer: row.applicationAnswer || null,
          post_count: postCount,
          comment_count: commentCount,
          last_active: row.lastActive || null,
          engagement_status: engagementStatus,
        };
      });

      const { data, error } = await supabase
        .from('members')
        .insert(membersToInsert)
        .select();

      if (error) throw error;
      return data as Member[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Member> }) => {
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const markOutreachSent = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('members')
        .update({
          outreach_sent: true,
          outreach_sent_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const markOutreachResponded = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('members')
        .update({ outreach_responded: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  // Stats calculations
  const stats = {
    total: members.length,
    neverEngaged: members.filter(m => m.engagement_status === 'never_engaged').length,
    atRisk: members.filter(m => m.engagement_status === 'at_risk').length,
    inactive: members.filter(m => m.engagement_status === 'inactive').length,
    active: members.filter(m => m.engagement_status === 'active').length,
    needsOutreach: members.filter(m => 
      ['never_engaged', 'at_risk', 'inactive'].includes(m.engagement_status) && 
      !m.outreach_sent
    ).length,
    outreachSentThisWeek: members.filter(m => {
      if (!m.outreach_sent_at) return false;
      const sentDate = parseISO(m.outreach_sent_at);
      return differenceInDays(new Date(), sentDate) <= 7;
    }).length,
    responseRate: (() => {
      const sent = members.filter(m => m.outreach_sent).length;
      const responded = members.filter(m => m.outreach_responded).length;
      return sent > 0 ? Math.round((responded / sent) * 100) : 0;
    })(),
  };

  return {
    members,
    isLoading,
    error,
    stats,
    importMembers,
    updateMember,
    markOutreachSent,
    markOutreachResponded,
    deleteMember,
  };
}
