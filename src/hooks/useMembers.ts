import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Member, EngagementStatus, MemberImportRow } from '@/types/member';
import { differenceInDays, parseISO } from 'date-fns';
import { SEGMENTATION_THRESHOLDS } from '@/config/segmentation';

export function useMembers() {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, isFetching, error, refetch } = useQuery({
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
      
      // Fetch existing members to check for duplicates (match by name)
      const { data: existingMembers } = await supabase
        .from('members')
        .select('id, skool_name, email, communities');
      
      const existingByName = new Map<string, { id: string; communities: string[] | null }>(
        (existingMembers || []).map((m: any) => [m.skool_name.toLowerCase().trim(), { id: m.id, communities: m.communities }])
      );

      const existingByEmail = new Map<string, { id: string; communities: string[] | null }>();
      for (const m of (existingMembers || []) as any[]) {
        if (m.email) {
          existingByEmail.set(String(m.email).toLowerCase().trim(), { id: m.id, communities: m.communities });
        }
      }

      // Track ids/emails already handled in this batch so one CSV can't collide with itself
      const seenIds = new Set<string>();
      const seenEmails = new Set<string>();
      
      const toInsert: any[] = [];
      const toUpdate: { id: string; updates: any }[] = [];
      
      for (const row of rows) {
        const joinDate = row.joinDate ? parseISO(row.joinDate) : null;
        const lastActive = row.lastActive ? parseISO(row.lastActive) : null;
        const postCount = row.posts || 0;
        const commentCount = row.comments || 0;
        
        // Calculate engagement status using configurable thresholds
        let engagementStatus: EngagementStatus = 'unknown';
        
        if (lastActive) {
          // We have real activity data — use it
          const daysSinceActive = differenceInDays(today, lastActive);
          if (daysSinceActive <= SEGMENTATION_THRESHOLDS.activeDays) {
            engagementStatus = 'active';
          } else if (daysSinceActive > SEGMENTATION_THRESHOLDS.inactiveDays) {
            engagementStatus = 'inactive';
          } else if (daysSinceActive > SEGMENTATION_THRESHOLDS.atRiskDays && (postCount > 0 || commentCount > 0)) {
            engagementStatus = 'at_risk';
          }
        } else if (joinDate && postCount === 0 && commentCount === 0) {
          // No last_active, no posts, no comments — we have no activity data
          // Keep as 'unknown' (we don't know their status)
          engagementStatus = 'unknown';
        }
        
        const memberData = {
          skool_name: row.name,
          skool_username: row.skoolUsername || null,
          email: row.email || null,
          join_date: row.joinDate || null,
          application_answer: row.applicationAnswer || null,
          post_count: postCount,
          comment_count: commentCount,
          last_active: row.lastActive || null,
          engagement_status: engagementStatus,
        } as any;
        
        const rowEmail = row.email ? row.email.toLowerCase().trim() : null;
        const existing =
          (rowEmail ? existingByEmail.get(rowEmail) : undefined) ||
          existingByName.get(row.name.toLowerCase().trim());

        // Skip exact duplicate rows within the same CSV
        if (rowEmail && seenEmails.has(rowEmail) && !existing) continue;
        if (existing && seenIds.has(existing.id)) continue;
        if (rowEmail) seenEmails.add(rowEmail);
        
        if (existing) {
          seenIds.add(existing.id);
          // Append community tag if not already present
          if (row.community) {
            const current = existing.communities || [];
            if (!current.includes(row.community)) {
              memberData.communities = [...current, row.community];
            }
          }
          // Update existing member
          toUpdate.push({ id: existing.id, updates: memberData });
        } else {
          if (row.community) {
            memberData.communities = [row.community];
          }
          // Insert new member
          toInsert.push(memberData);
        }
      }
      
      const results: Member[] = [];
      
      // Insert new members in chunks so one bad row doesn't sink the whole import
      let insertedCount = 0;
      const skipped: string[] = [];
      for (let i = 0; i < toInsert.length; i += 100) {
        const chunk = toInsert.slice(i, i + 100);
        const { data: inserted, error: insertError } = await supabase
          .from('members')
          .insert(chunk)
          .select();

        if (!insertError) {
          results.push(...((inserted || []) as Member[]));
          insertedCount += chunk.length;
          continue;
        }

        // Fall back to row-by-row so we can skip conflicts instead of failing everything
        for (const single of chunk) {
          const { data: one, error: oneError } = await supabase
            .from('members')
            .insert(single)
            .select()
            .single();
          if (oneError) {
            skipped.push(single.skool_name);
          } else {
            results.push(one as Member);
            insertedCount++;
          }
        }
      }
      
      // Update existing members
      for (const { id, updates } of toUpdate) {
        const { data: updated, error: updateError } = await supabase
          .from('members')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        results.push(updated as Member);
      }
      
      return { 
        results, 
        inserted: insertedCount, 
        updated: toUpdate.length,
        skipped,
      };
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
          message_status: 'sent',
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
        .update({ 
          outreach_responded: true,
          message_status: 'replied',
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

  const addMember = useMutation({
    mutationFn: async (memberData: {
      skool_name: string;
      skool_username?: string;
      application_answer?: string;
      join_date?: string;
      email?: string;
    }) => {
      const today = new Date();
      const joinDate = memberData.join_date ? parseISO(memberData.join_date) : today;
      const daysSinceJoin = differenceInDays(today, joinDate);
      
      // New members added manually have no activity data — keep as 'unknown'
      const engagementStatus: EngagementStatus = 'unknown';

      const { data, error } = await supabase
        .from('members')
        .insert({
          skool_name: memberData.skool_name,
          skool_username: memberData.skool_username || null,
          application_answer: memberData.application_answer || null,
          join_date: memberData.join_date || null,
          email: memberData.email || null,
          post_count: 0,
          comment_count: 0,
          engagement_status: engagementStatus,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Member;
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
    notContacted: members.filter(m => m.message_status === 'not_contacted').length,
    dmReady: members.filter(m => m.message_status === 'message_generated').length,
    messageSent: members.filter(m => m.message_status === 'sent').length,
    replied: members.filter(m => m.message_status === 'replied').length,
  };

  return {
    members,
    isLoading,
    isFetching,
    refetch,
    error,
    stats,
    importMembers,
    updateMember,
    markOutreachSent,
    markOutreachResponded,
    deleteMember,
    addMember,
  };
}
