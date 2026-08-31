import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IntroductionPreviewRow, MemberCompassProfile, MemberSource } from '@/types/memberCompass';

const db = supabase as any;

async function fetchInChunks<T>(ids: string[], fetcher: (chunk: string[]) => Promise<T[]>) {
  const unique = [...new Set(ids.filter(Boolean))];
  const result: T[] = [];
  for (let i = 0; i < unique.length; i += 250) {
    result.push(...await fetcher(unique.slice(i, i + 250)));
  }
  return result;
}

export function useMemberCompassProfiles(memberIds: string[]) {
  const key = memberIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['member-compass-profiles', key],
    enabled: memberIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      return fetchInChunks<MemberCompassProfile>(memberIds, async (chunk) => {
        const { data, error } = await db
          .from('member_compass_profiles')
          .select('*')
          .in('member_id', chunk);
        if (error) throw error;
        return (data || []) as MemberCompassProfile[];
      });
    },
  });
}

export function useMemberCompassMember(memberId?: string | null) {
  return useQuery({
    queryKey: ['member-compass-member', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const [profileResult, sourceResult] = await Promise.all([
        db.from('member_compass_profiles').select('*').eq('member_id', memberId).maybeSingle(),
        db.from('member_sources').select('*').eq('member_id', memberId).order('created_at', { ascending: false }),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (sourceResult.error) throw sourceResult.error;
      return {
        profile: (profileResult.data || null) as MemberCompassProfile | null,
        sources: (sourceResult.data || []) as MemberSource[],
      };
    },
  });
}

export function useSaveMemberCompassProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: Partial<MemberCompassProfile> }) => {
      const payload = {
        member_id: memberId,
        ...updates,
        manually_edited: true,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await db
        .from('member_compass_profiles')
        .upsert(payload, { onConflict: 'member_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as MemberCompassProfile;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['member-compass-member', variables.memberId] });
      client.invalidateQueries({ queryKey: ['member-compass-profiles'] });
    },
  });
}

export function useAnalyzeMemberCompass() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, force = false }: { memberId: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('analyze-member-compass', {
        body: { action: 'analyze', memberId, force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ['member-compass-member', variables.memberId] });
      client.invalidateQueries({ queryKey: ['member-compass-profiles'] });
    },
  });
}

export function useImportIntroductionSources() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (rows: IntroductionPreviewRow[]) => {
      const now = new Date().toISOString();
      const payloads = rows.map((row) => {
        const memberId = row.selectedMemberId || row.memberId || null;
        return {
          member_id: memberId,
          source_type: 'introduction_thread',
          source_url: row.sourceUrl || null,
          source_external_id: row.externalId || null,
          source_author: row.author || null,
          source_username: row.username || null,
          source_text: row.text,
          captured_at: row.capturedAt || now,
          match_status: memberId ? 'matched' : row.matchStatus,
          match_confidence: memberId ? (row.matchConfidence || 0.8) : null,
          updated_at: now,
        };
      });

      const { data, error } = await db
        .from('member_sources')
        .upsert(payloads, { onConflict: 'source_type,source_url,source_external_id' })
        .select('*');
      if (error) throw error;

      const matchedIds = [...new Set(payloads.map((row) => row.member_id).filter(Boolean))] as string[];
      return { rows: data || [], matchedIds };
    },
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ['member-compass-profiles'] });
      for (const memberId of result.matchedIds) {
        client.invalidateQueries({ queryKey: ['member-compass-member', memberId] });
      }
    },
  });
}

export async function analyzeImportedMembers(memberIds: string[]) {
  const unique = [...new Set(memberIds.filter(Boolean))];
  let analyzed = 0;
  const errors: string[] = [];
  for (const memberId of unique) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-member-compass', {
        body: { action: 'analyze', memberId, force: false },
      });
      if (error || data?.error) throw error || new Error(data.error);
      analyzed += 1;
    } catch (error) {
      errors.push(`${memberId}: ${error instanceof Error ? error.message : 'analysis failed'}`);
    }
  }
  return { analyzed, errors };
}

export async function backfillApplicationAnswers(limit = 20) {
  const { data, error } = await supabase.functions.invoke('analyze-member-compass', {
    body: { action: 'backfill', limit },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
