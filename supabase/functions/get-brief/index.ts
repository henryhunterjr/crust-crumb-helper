// Crust & Crumb Helper — Brief Read Endpoint
// GET https://{PROJECT_REF}.supabase.co/functions/v1/get-brief?date=2026-03-17
// Returns the latest brief and all related data for a given date

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth check — same key as ingest
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }
  const token = authHeader.replace('Bearer ', '')
  if (INGEST_API_KEY && token !== INGEST_API_KEY) {
    return jsonResponse({ error: 'Invalid API key' }, 403)
  }

  try {
    const url = new URL(req.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const briefId = url.searchParams.get('brief_id')
    const section = url.searchParams.get('section') // optional: filter to one section

    // 1. Get the brief log
    let briefQuery = supabase.from('brief_logs').select('*')
    if (briefId) {
      briefQuery = briefQuery.eq('id', briefId)
    } else {
      briefQuery = briefQuery.eq('brief_date', date)
    }
    const { data: briefs, error: briefError } = await briefQuery
      .order('created_at', { ascending: false })
      .limit(1)

    if (briefError) {
      return jsonResponse({ error: 'Failed to fetch brief', detail: briefError.message }, 500)
    }
    if (!briefs?.length) {
      return jsonResponse({ error: 'No brief found', date }, 404)
    }

    const brief = briefs[0]
    const id = brief.id
    const result: Record<string, unknown> = { brief }

    // Helper to conditionally fetch sections
    const sections = section ? [section] : [
      'action_items', 'draft_replies', 'calendar_entries',
      'content_ideas', 'community_pulse', 'morning_posts'
    ]

    const fetches: Promise<void>[] = []

    if (sections.includes('action_items')) {
      fetches.push(
        supabase.from('action_items').select('*').eq('brief_id', id)
          .order('priority', { ascending: true })
          .then(({ data }) => { result.actionItems = data || [] })
      )
    }
    if (sections.includes('draft_replies')) {
      fetches.push(
        supabase.from('draft_replies').select('*').eq('brief_id', id)
          .order('priority', { ascending: true })
          .then(({ data }) => { result.draftReplies = data || [] })
      )
    }
    if (sections.includes('calendar_entries')) {
      fetches.push(
        supabase.from('calendar_entries').select('*').eq('brief_id', id)
          .order('start_at', { ascending: true })
          .then(({ data }) => { result.calendarEntries = data || [] })
      )
    }
    if (sections.includes('content_ideas')) {
      fetches.push(
        supabase.from('content_ideas').select('*').eq('brief_id', id)
          .then(({ data }) => { result.contentIdeas = data || [] })
      )
    }
    if (sections.includes('community_pulse')) {
      fetches.push(
        supabase.from('community_pulse_runs').select('*').eq('brief_id', id)
          .limit(1)
          .then(({ data }) => { result.communityPulse = data?.[0] || null })
      )
    }
    if (sections.includes('morning_posts')) {
      fetches.push(
        supabase.from('morning_posts').select('*').eq('brief_id', id)
          .order('is_alternate', { ascending: true })
          .then(({ data }) => { result.morningPosts = data || [] })
      )
    }

    await Promise.all(fetches)

    return jsonResponse(result)
  } catch (err) {
    return jsonResponse({ error: 'Internal server error', detail: err.message }, 500)
  }
})
