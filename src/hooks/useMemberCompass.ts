import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MemberCompassProfile, MemberSource, PreviewRow } from '@/types/compass';

export function useMemberCompass() {
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['member-compass-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_compass_profiles')
        .select('*');
      if (error) throw error;
      return (data || []) as unknown as MemberCompassProfile[];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['member-sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_sources')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as MemberSource[];
    },
  });

  const profilesByMember = new Map<string, MemberCompassProfile>();
  for (const p of profiles) profilesByMember.set(p.member_id, p);

  const sourcesByMember = new Map<string, MemberSource[]>();
  for (const s of sources) {
    if (!s.member_id) continue;
    sourcesByMember.set(s.member_id, [...(sourcesByMember.get(s.member_id) || []), s]);
  }

  const reviewQueue = sources.filter(
    (s) => s.match_status === 'ambiguous' || s.match_status === 'unmatched'
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['member-compass-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['member-sources'] });
  };

  /** Commit previewed rows. Ambiguous / unmatched land in the review queue, never merged. */
  const commitSources = useMutation({
    mutationFn: async (rows: PreviewRow[]) => {
      const payload = rows.map((r) => ({
        member_id: r.matchStatus === 'matched' ? r.matchedMemberId : null,
        source_type: r.sourceType || 'introduction',
        source_url: r.url || null,
        source_external_id: r.externalId || null,
        source_author: r.author || null,
        source_author_username: r.username || null,
        source_text: r.text,
        captured_at: r.capturedAt || new Date().toISOString(),
        match_status: r.matchStatus,
        match_confidence: r.matchConfidence,
        match_note: r.matchNote,
      }));

      let inserted = 0;
      let duplicates = 0;
      for (const row of payload) {
        const { error } = await supabase.from('member_sources').insert(row as never);
        if (error) {
          if (error.code === '23505') duplicates++;
          else throw error;
        } else inserted++;
      }
      return { inserted, duplicates };
    },
    onSuccess: invalidate,
  });

  /** Resolve one review-queue item by attaching it to a member (explicit, never silent). */
  const resolveSource = useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string | null }) => {
      const { error } = await supabase
        .from('member_sources')
        .update({
          member_id: memberId,
          match_status: memberId ? 'matched' : 'ignored',
          match_note: memberId ? 'Manually assigned by Henry.' : 'Manually ignored.',
        } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const analyze = useMutation({
    mutationFn: async (input: {
      member_id?: string;
      member_ids?: string[];
      backfill?: boolean;
      limit?: number;
      force?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('analyze-member-compass', {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { analyzed: number; skipped: number; remaining: number; results: any[] };
    },
    onSuccess: invalidate,
  });

  const updateProfile = useMutation({
    mutationFn: async ({
      memberId,
      updates,
    }: {
      memberId: string;
      updates: Partial<MemberCompassProfile>;
    }) => {
      const { error } = await supabase
        .from('member_compass_profiles')
        .upsert(
          { member_id: memberId, ...updates, manually_edited: true } as never,
          { onConflict: 'member_id' }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    profiles,
    profilesByMember,
    sources,
    sourcesByMember,
    reviewQueue,
    isLoading,
    commitSources,
    resolveSource,
    analyze,
    updateProfile,
  };
}
