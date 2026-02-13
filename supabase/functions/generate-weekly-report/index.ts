import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { week_start, week_end } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all data for the week
    const [messagesRes, membersRes, postsRes] = await Promise.all([
      supabase.from('outreach_messages').select('*').gte('created_at', week_start).lte('created_at', week_end + 'T23:59:59'),
      supabase.from('members').select('*'),
      supabase.from('scheduled_posts').select('*').gte('scheduled_date', week_start).lte('scheduled_date', week_end),
    ]);

    const messages = messagesRes.data || [];
    const members = membersRes.data || [];
    const posts = postsRes.data || [];

    const sentMessages = messages.filter((m: any) => m.status === 'sent' || m.status === 'replied');
    const respondedMessages = messages.filter((m: any) => m.responded === true);
    const newMembers = members.filter((m: any) => m.join_date && m.join_date >= week_start && m.join_date <= week_end);
    const activeMembers = members.filter((m: any) => m.engagement_status === 'active');
    const atRiskMembers = members.filter((m: any) => m.engagement_status === 'at_risk');
    const neverEngaged = members.filter((m: any) => m.engagement_status === 'never_engaged' || !m.engagement_status || m.engagement_status === 'unknown');
    const welcomedThisWeek = members.filter((m: any) => m.outreach_sent_at && m.outreach_sent_at >= week_start && m.outreach_sent_at <= week_end + 'T23:59:59');
    const postedPosts = posts.filter((p: any) => p.status === 'posted');

    const responseRate = sentMessages.length > 0 ? Math.round((respondedMessages.length / sentMessages.length) * 100) : 0;
    const activeRate = members.length > 0 ? Math.round((activeMembers.length / members.length) * 100) : 0;
    const welcomeRate = members.length > 0 ? Math.round((welcomedThisWeek.length / members.length) * 100) : 0;

    // Health score calculation
    const welcomeRatio = members.length > 0 ? (members.filter((m: any) => m.outreach_sent).length / members.length) : 0;
    const activeRatio = members.length > 0 ? (activeMembers.length / members.length) : 0;
    const neverEngagedRatio = members.length > 0 ? (neverEngaged.length / members.length) : 1;
    const healthScore = Math.min(100, Math.round(
      (welcomeRatio * 30) + (activeRatio * 40) + ((1 - neverEngagedRatio) * 20) + (responseRate > 0 ? 10 : 0)
    ));

    // Generate AI recommendations
    let recommendations: string[] = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      const dataContext = `
Total members: ${members.length}
New this week: ${newMembers.length}
Active: ${activeMembers.length} (${activeRate}%)
At risk: ${atRiskMembers.length}
Never engaged: ${neverEngaged.length}
DMs sent this week: ${sentMessages.length}
Response rate: ${responseRate}%
Welcomed this week: ${welcomedThisWeek.length}
Posts published: ${postedPosts.length} of ${posts.length}
Members needing welcome: ${members.filter((m: any) => !m.outreach_sent).length}
Members with email: ${members.filter((m: any) => m.email).length}
`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are analyzing weekly community data for Henry Hunter's Crust & Crumb Academy. Generate 3-4 specific, actionable recommendations. Be specific with numbers. Include timeframes. Reference app features. Prioritize by impact. Keep each recommendation to 2-3 sentences. Direct, practical tone. Return ONLY a JSON array of strings.`,
              },
              { role: 'user', content: `Here's this week's data:\n${dataContext}\n\nGenerate recommendations as a JSON array.` },
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content?.trim() || '[]';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            recommendations = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error('AI recommendation error:', e);
      }
    }

    const reportData = {
      dms_sent: sentMessages.length,
      dms_generated: messages.length,
      response_rate: responseRate,
      responded_count: respondedMessages.length,
      total_members: members.length,
      new_members: newMembers.length,
      active_count: activeMembers.length,
      active_rate: activeRate,
      at_risk_count: atRiskMembers.length,
      never_engaged_count: neverEngaged.length,
      welcomed_this_week: welcomedThisWeek.length,
      welcome_rate: welcomeRate,
      posts_published: postedPosts.length,
      posts_total: posts.length,
      recommendations,
    };

    // Upsert report
    const { data: existing } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('week_start', week_start)
      .maybeSingle();

    let report;
    if (existing) {
      const { data, error } = await supabase
        .from('weekly_reports')
        .update({ report_data: reportData, health_score: healthScore, generated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      report = data;
    } else {
      const { data, error } = await supabase
        .from('weekly_reports')
        .insert({ week_start, week_end, report_data: reportData, health_score: healthScore })
        .select()
        .single();
      if (error) throw error;
      report = data;
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
