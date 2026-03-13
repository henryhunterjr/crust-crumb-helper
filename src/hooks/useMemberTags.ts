import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MemberTag {
  id: string;
  member_id: string;
  tag: string;
  source: string;
  created_at: string;
}

export interface InterestMapping {
  id: string;
  keywords: string[];
  recommended_course: string | null;
  recommended_recipe: string | null;
  quick_win: string | null;
  book_link: string | null;
  created_at: string;
  updated_at: string;
}

// Tag color categories
export function getTagColor(tag: string): string {
  // Interest tags → blue
  const interestTags = ['sourdough-interested', 'shaping-focused', 'yeast-water', 'flavor-explorer', 'focaccia-fan', 'enriched-interested', 'yeasted-interested', 'gluten-free'];
  if (interestTags.some(t => tag.includes(t) || t.includes(tag))) return 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400';

  // Skill level → green
  if (tag === 'beginner' || tag === 'intermediate' || tag === 'advanced') return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400';

  // Engagement negative → red/orange
  if (tag === 'never-engaged' || tag === 'at-risk') return 'bg-destructive/15 text-destructive border-destructive/30';

  // Positive status → gold
  if (['super-engaged', 'bake-along-regular', 'course-completer'].includes(tag)) return 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400';

  // Business → purple
  if (tag === 'business-builder') return 'bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400';

  // Default
  return 'bg-muted text-muted-foreground';
}

// Auto-tagging logic based on application answer
export function generateTagsFromText(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tags: string[] = [];

  // Skill-level tags
  if (/\b(new to|first time|learning|started|beginner|just start|never baked)\b/i.test(lower)) tags.push('beginner');
  if (/\b(intermediate|some experience|been baking|couple years|few years)\b/i.test(lower)) tags.push('intermediate');
  if (/\b(improve|perfect|master|years|advanced|professional)\b/i.test(lower)) tags.push('advanced');

  // Interest tags
  if (/\b(sourdough|sour dough|sd|starter|levain|wild yeast)\b/i.test(lower)) tags.push('sourdough-interested');
  if (/\b(shaping|scoring|presentation|bread ear|crumb structure)\b/i.test(lower)) tags.push('shaping-focused');
  if (/\b(sell|market|farmers? market|cottage|business|income)\b/i.test(lower)) tags.push('business-builder');
  if (/\b(yeast water|fruit water|natural leaven)\b/i.test(lower)) tags.push('yeast-water');
  if (/\b(flavor|tang|sour|mild|ferment)/i.test(lower)) tags.push('flavor-explorer');
  if (/\b(focaccia|flatbread|pizza)\b/i.test(lower)) tags.push('focaccia-fan');
  if (/\b(challah|brioche|babka|milk bread|enriched|cinnamon roll|danish)\b/i.test(lower)) tags.push('enriched-interested');
  if (/\b(sandwich|loaf|yeasted|yeast bread|rolls|buns|hamburger)\b/i.test(lower)) tags.push('yeasted-interested');
  if (/\b(gluten.?free|celiac|gluten intoleran)\b/i.test(lower)) tags.push('gluten-free');

  return [...new Set(tags)];
}

// Generate behavior-based tags from member data
export function generateBehaviorTags(member: { post_count: number; comment_count: number; last_active: string | null; engagement_status: string }): string[] {
  const tags: string[] = [];

  if (member.post_count === 0 && member.comment_count === 0) {
    tags.push('never-engaged');
  }

  if (member.last_active) {
    const daysSince = Math.floor((Date.now() - new Date(member.last_active).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14 && (member.post_count > 0 || member.comment_count > 0)) {
      tags.push('at-risk');
    }
  }

  if ((member.post_count || 0) + (member.comment_count || 0) >= 10) {
    tags.push('super-engaged');
  }

  return tags;
}

export function useMemberTags() {
  const queryClient = useQueryClient();

  const { data: allTags = [], isLoading } = useQuery({
    queryKey: ['member-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_tags')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MemberTag[];
    },
  });

  // Group tags by member_id for fast lookup
  const tagsByMember = allTags.reduce((acc, tag) => {
    if (!acc[tag.member_id]) acc[tag.member_id] = [];
    acc[tag.member_id].push(tag);
    return acc;
  }, {} as Record<string, MemberTag[]>);

  const addTag = useMutation({
    mutationFn: async ({ memberId, tag, source = 'manual' }: { memberId: string; tag: string; source?: string }) => {
      const { data, error } = await supabase
        .from('member_tags')
        .insert({ member_id: memberId, tag, source })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-tags'] }),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from('member_tags').delete().eq('id', tagId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-tags'] }),
  });

  const bulkAddTags = useMutation({
    mutationFn: async (entries: { member_id: string; tag: string; source: string }[]) => {
      if (entries.length === 0) return;
      const { error } = await supabase.from('member_tags').upsert(entries, { onConflict: 'member_id,tag', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['member-tags'] }),
  });

  // Auto-tag a set of members based on their application answers and behavior
  const autoTagMembers = async (members: { id: string; application_answer: string | null; post_count: number; comment_count: number; last_active: string | null; engagement_status: string }[]) => {
    const entries: { member_id: string; tag: string; source: string }[] = [];

    for (const member of members) {
      const textTags = generateTagsFromText(member.application_answer || '');
      const behaviorTags = generateBehaviorTags(member);
      const allMemberTags = [...new Set([...textTags, ...behaviorTags])];

      for (const tag of allMemberTags) {
        entries.push({ member_id: member.id, tag, source: 'auto' });
      }
    }

    if (entries.length > 0) {
      await bulkAddTags.mutateAsync(entries);
    }

    return entries.length;
  };

  // Get unique tags with counts
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag.tag] = (acc[tag.tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    allTags,
    tagsByMember,
    tagCounts,
    isLoading,
    addTag,
    removeTag,
    bulkAddTags,
    autoTagMembers,
  };
}

export function useInterestMappings() {
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['interest-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interest_mappings')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as InterestMapping[];
    },
  });

  const addMapping = useMutation({
    mutationFn: async (mapping: Omit<InterestMapping, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('interest_mappings').insert(mapping).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interest-mappings'] }),
  });

  const updateMapping = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InterestMapping> & { id: string }) => {
      const { data, error } = await supabase.from('interest_mappings').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interest-mappings'] }),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('interest_mappings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interest-mappings'] }),
  });

  return { mappings, isLoading, addMapping, updateMapping, deleteMapping };
}
