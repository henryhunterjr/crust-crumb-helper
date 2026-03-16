// Crust & Crumb Helper — Brief Ingestion Edge Function
// POST https://{PROJECT_REF}.supabase.co/functions/v1/ingest-brief
// Accepts structured Morning Brief or Bake-Along Recap payloads from Perplexity

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const INGEST_API_KEY = Deno.env.get('INGEST_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  if (INGEST_API_KEY && token !== INGEST_API_KEY) {
    return jsonResponse({ error: 'Invalid API key' }, 403)
  }

  try {
    const payload = await req.json()

    // Validate required fields
    if (!payload.runId) {
      return jsonResponse({ error: 'Missing required field: runId' }, 400)
    }

    // Track what we create
    const counts = {
      actionItems: 0,
      draftReplies: 0,
      calendarEntries: 0,
      contentIdeas: 0,
      communityPulse: 0,
      morningPosts: 0,
    }

    // 1. Create the brief log
    const { data: briefLog, error: briefError } = await supabase
      .from('brief_logs')
      .insert({
        run_id: payload.runId,
        brief_type: payload.briefType || 'morning_brief',
        brief_date: payload.briefDate || new Date().toISOString().split('T')[0],
        generated_at: payload.generatedAt || new Date().toISOString(),
        time_window_hours: payload.timeWindowHours || 48,
        raw_payload: payload,
        status: 'processing',
      })
      .select('id')
      .single()

    if (briefError) {
      console.error('Brief log insert error:', briefError)
      return jsonResponse({ error: 'Failed to create brief log', detail: briefError.message }, 500)
    }

    const briefId = briefLog.id

    // 2. Insert action items
    if (payload.actionItems?.length) {
      const rows = payload.actionItems.map((item: any) => ({
        external_id: item.id,
        brief_id: briefId,
        title: item.title,
        description: item.description,
        priority: item.priority || 'normal',
        due_at: item.dueAt || null,
        source: item.source || 'brief',
        tags: item.tags || [],
        related_skool_url: item.relatedSkoolUrl || null,
        status: item.status || 'pending',
      }))

      const { error } = await supabase.from('action_items').insert(rows)
      if (error) console.error('Action items insert error:', error)
      else counts.actionItems = rows.length
    }

    // 3. Insert draft replies
    if (payload.draftReplies?.length) {
      const rows = payload.draftReplies.map((item: any) => ({
        external_id: item.id,
        brief_id: briefId,
        action_type: item.actionType,
        member_name: item.memberName || null,
        post_context: item.postContext || null,
        how_to_find: item.howToFind || null,
        posted_ago: item.postedAgo || null,
        member_message: item.memberMessage || null,
        draft_text: item.draftText,
        priority: item.priority || 'normal',
        needs_review_flags: item.needsReviewFlags || ['NONE'],
        status: 'pending',
      }))

      const { error } = await supabase.from('draft_replies').insert(rows)
      if (error) console.error('Draft replies insert error:', error)
      else counts.draftReplies = rows.length
    }

    // 4. Insert calendar entries
    if (payload.calendarEntries?.length) {
      const rows = payload.calendarEntries.map((item: any) => ({
        external_id: item.id,
        brief_id: briefId,
        title: item.title,
        description: item.description || null,
        start_at: item.startAt,
        end_at: item.endAt || null,
        all_day: item.allDay || false,
        source: item.source || 'brief',
        tags: item.tags || [],
        status: 'scheduled',
      }))

      const { error } = await supabase.from('calendar_entries').insert(rows)
      if (error) console.error('Calendar entries insert error:', error)
      else counts.calendarEntries = rows.length
    }

    // 5. Insert content ideas
    if (payload.contentIdeas?.length) {
      const rows = payload.contentIdeas.map((item: any) => ({
        external_id: item.id,
        brief_id: briefId,
        category: item.category,
        title: item.title,
        description: item.description || null,
        suggested_format: item.suggestedFormat || null,
        related_members: item.relatedMembers || [],
        related_threads: item.relatedThreads || [],
        status: 'new',
      }))

      const { error } = await supabase.from('content_ideas').insert(rows)
      if (error) console.error('Content ideas insert error:', error)
      else counts.contentIdeas = rows.length
    }

    // 6. Insert community pulse
    if (payload.communityPulse) {
      const pulse = payload.communityPulse
      const { error } = await supabase.from('community_pulse_runs').insert({
        brief_id: briefId,
        recurring_questions: pulse.recurringQuestions || [],
        emotional_temperature: pulse.emotionalTemperature || null,
        secret_worry: pulse.secretWorry || null,
        who_is_showing_up: pulse.whoIsShowingUp || [],
        leaderboard_movement: pulse.leaderboardMovement || [],
        win_of_the_day: pulse.winOfTheDay || null,
        open_loops: pulse.openLoops || [],
      })

      if (error) console.error('Community pulse insert error:', error)
      else counts.communityPulse = 1
    }

    // 7. Insert morning post(s)
    if (payload.morningPost) {
      const mp = payload.morningPost
      const posts: any[] = []

      // Main post (12:30 PM slot)
      posts.push({
        external_id: mp.id,
        brief_id: briefId,
        slot: mp.slot || '12:30 PM ET',
        title: mp.title,
        draft_text: mp.draftText,
        call_to_action: mp.callToAction || null,
        is_alternate: false,
        status: 'drafted',
      })

      // Alternate evening post (7:00 PM slot)
      if (mp.alternateEveningPost) {
        const alt = mp.alternateEveningPost
        posts.push({
          external_id: mp.id + '-alt',
          brief_id: briefId,
          slot: alt.slot || '7:00 PM ET',
          title: alt.title,
          draft_text: alt.draftText,
          call_to_action: null,
          is_alternate: true,
          status: 'drafted',
        })
      }

      const { error } = await supabase.from('morning_posts').insert(posts)
      if (error) console.error('Morning posts insert error:', error)
      else counts.morningPosts = posts.length
    }

    // 8. Update brief log with counts and mark as processed
    await supabase
      .from('brief_logs')
      .update({
        items_created: counts,
        status: 'processed',
      })
      .eq('id', briefId)

    return jsonResponse({
      status: 'processed',
      briefId,
      runId: payload.runId,
      created: counts,
    })

  } catch (err) {
    console.error('Ingest brief error:', err)
    return jsonResponse({ error: 'Internal server error', detail: err.message }, 500)
  }
})
