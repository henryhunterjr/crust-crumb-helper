import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, handleCors } from '../_shared/cors.ts';

function normalizeStr(s: string): string {
  return (s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all subscribers and members
    const [subResult, memResult] = await Promise.all([
      supabase.from('email_subscribers').select('*'),
      supabase.from('members').select('*'),
    ]);

    const subscribers = subResult.data || [];
    const members = memResult.data || [];

    const matches: any[] = [];
    const nonMembers: any[] = [];
    const needsReview: any[] = [];

    // Build member lookup maps
    const memberByEmail = new Map<string, any>();
    const membersByName = new Map<string, any[]>();

    for (const m of members) {
      if (m.email) memberByEmail.set(normalizeStr(m.email), m);
      const nameParts = m.skool_name.trim().toLowerCase().split(/\s+/);
      const key = nameParts.join(' ');
      if (!membersByName.has(key)) membersByName.set(key, []);
      membersByName.get(key)!.push(m);
    }

    for (const sub of subscribers) {
      const subEmail = normalizeStr(sub.email);
      let matched = false;
      let matchedMember: any = null;
      let matchType = '';
      let confidence = '';

      // 1. Exact email match
      if (memberByEmail.has(subEmail)) {
        matchedMember = memberByEmail.get(subEmail);
        matchType = 'email';
        confidence = 'high';
        matched = true;
      }

      // 2. Exact name match
      if (!matched && sub.first_name && sub.last_name) {
        const fullName = `${sub.first_name} ${sub.last_name}`.trim().toLowerCase();
        if (membersByName.has(fullName)) {
          const candidates = membersByName.get(fullName)!;
          matchedMember = candidates[0];
          matchType = 'name_exact';
          confidence = 'high';
          matched = true;
        }
      }

      // 3. Fuzzy name match
      if (!matched && sub.first_name) {
        const subFirst = normalizeStr(sub.first_name);
        const subLast = sub.last_name ? normalizeStr(sub.last_name) : '';

        for (const m of members) {
          const nameParts = m.skool_name.trim().toLowerCase().split(/\s+/);
          const mFirst = normalizeStr(nameParts[0] || '');
          const mLast = normalizeStr(nameParts.slice(1).join(' '));

          if (mFirst === subFirst && subLast && mLast) {
            const dist = levenshtein(subLast, mLast);
            if (dist <= 2 && dist > 0) {
              matchedMember = m;
              matchType = 'fuzzy_name';
              confidence = dist === 1 ? 'medium' : 'low';
              matched = true;
              break;
            }
          }
        }
      }

      if (matched && matchedMember) {
        if (confidence === 'high') {
          matches.push({
            subscriber: sub,
            member: matchedMember,
            match_type: matchType,
            confidence,
          });
          // Update subscriber record
          await supabase.from('email_subscribers').update({
            is_skool_member: true,
            matched_member_id: matchedMember.id,
          }).eq('id', sub.id);
        } else {
          needsReview.push({
            subscriber: sub,
            possible_member: matchedMember,
            match_type: matchType,
            confidence,
          });
        }
      } else {
        nonMembers.push({ subscriber: sub });
        // Ensure marked as non-member
        if (sub.is_skool_member) {
          await supabase.from('email_subscribers').update({
            is_skool_member: false,
            matched_member_id: null,
          }).eq('id', sub.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        total_subscribers: subscribers.length,
        matches: matches.length,
        non_members: nonMembers.length,
        needs_review: needsReview.length,
        matched: matches,
        non_member_list: nonMembers,
        review_list: needsReview,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cross-reference error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
