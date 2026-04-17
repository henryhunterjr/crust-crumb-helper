import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch active rules
    const { data: rules, error: rulesError } = await supabase
      .from('outreach_rules')
      .select('*')
      .eq('is_active', true);
    if (rulesError) throw rulesError;

    // Fetch members
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*');
    if (membersError) throw membersError;

    // Fetch existing pending messages to avoid duplicates
    const { data: pendingMessages } = await supabase
      .from('outreach_messages')
      .select('member_id')
      .eq('status', 'generated');
    const pendingMemberIds = new Set((pendingMessages || []).map((m: any) => m.member_id));

    const now = new Date();
    let totalGenerated = 0;
    const ruleResults: Array<{ rule: string; matched: number; generated: number }> = [];

    for (const rule of (rules || [])) {
      const matchedMembers: any[] = [];

      for (const member of (members || [])) {
        // Skip if already has pending outreach
        if (pendingMemberIds.has(member.id)) continue;

        let fieldValue = 0;

        switch (rule.condition_field) {
          case 'days_since_join': {
            if (!member.join_date) continue;
            fieldValue = Math.floor((now.getTime() - new Date(member.join_date).getTime()) / (1000 * 60 * 60 * 24));
            // For welcome rules, also check not yet welcomed
            if (rule.rule_type === 'welcome' && member.outreach_sent) continue;
            break;
          }
          case 'days_inactive': {
            if (!member.last_active) {
              fieldValue = member.join_date
                ? Math.floor((now.getTime() - new Date(member.join_date).getTime()) / (1000 * 60 * 60 * 24))
                : 999;
            } else {
              fieldValue = Math.floor((now.getTime() - new Date(member.last_active).getTime()) / (1000 * 60 * 60 * 24));
            }
            // For at_risk rules, only include previously active members
            if (rule.rule_type === 'at_risk' && (member.post_count || 0) === 0 && (member.comment_count || 0) === 0) continue;
            break;
          }
          case 'days_since_outreach': {
            if (!member.outreach_sent_at) continue;
            fieldValue = Math.floor((now.getTime() - new Date(member.outreach_sent_at).getTime()) / (1000 * 60 * 60 * 24));
            break;
          }
          case 'post_count': fieldValue = member.post_count || 0; break;
          case 'comment_count': fieldValue = member.comment_count || 0; break;
          default: continue;
        }

        let matches = false;
        switch (rule.condition_operator) {
          case 'gte': matches = fieldValue >= rule.condition_value; break;
          case 'lte': matches = fieldValue <= rule.condition_value; break;
          case 'eq': matches = fieldValue === rule.condition_value; break;
        }

        if (matches) matchedMembers.push(member);
      }

      // Limit per rule execution (max 25 per batch)
      const batch = matchedMembers.slice(0, 25);
      let generated = 0;

      if (rule.action_type === 'generate_dm' && batch.length > 0) {
        const messagesToInsert = batch.map(member => ({
          member_id: member.id,
          member_name: member.skool_name,
          message_type: rule.action_value || 'custom',
          message_text: `[Rule: ${rule.rule_name}] Auto-generated message for ${member.skool_name}. Edit before sending.`,
          status: 'generated',
          priority: rule.rule_type === 'welcome' ? 'high' : 'medium',
          template_type: rule.action_value || null,
          engagement_status_at_send: member.engagement_status || 'unknown',
        }));

        const { error: insertError } = await supabase
          .from('outreach_messages')
          .insert(messagesToInsert);

        if (!insertError) {
          generated = messagesToInsert.length;
          totalGenerated += generated;
          // Add to pending set to prevent duplicates within this run
          batch.forEach(m => pendingMemberIds.add(m.id));
        }
      }

      ruleResults.push({ rule: rule.rule_name, matched: matchedMembers.length, generated });
    }

    // Log to activity feed
    if (totalGenerated > 0) {
      await supabase.from('activity_feed').insert({
        activity_type: 'rules_evaluated',
        title: `Rules generated ${totalGenerated} messages`,
        description: ruleResults.map(r => `${r.rule}: ${r.generated} generated (${r.matched} matched)`).join('; '),
      });
    }

    return new Response(
      JSON.stringify({ generated: totalGenerated, results: ruleResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rule evaluation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
