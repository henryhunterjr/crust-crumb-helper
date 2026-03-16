
-- =============================================
-- Crust & Crumb Helper — Brief Ingestion Tables
-- =============================================

-- 1. Brief Logs — one row per morning brief or recap run
CREATE TABLE IF NOT EXISTS brief_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text NOT NULL UNIQUE,
  brief_type text NOT NULL DEFAULT 'morning_brief',
  brief_date date NOT NULL DEFAULT CURRENT_DATE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  time_window_hours integer NOT NULL DEFAULT 48,
  raw_payload jsonb,
  items_created jsonb,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Action Items — tasks Henry needs to do
CREATE TABLE IF NOT EXISTS action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  due_at timestamptz,
  source text,
  tags text[] DEFAULT '{}',
  related_skool_url text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Draft Replies — comment replies, DMs, new posts queued for review
CREATE TABLE IF NOT EXISTS draft_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  member_name text,
  post_context text,
  how_to_find text,
  posted_ago text,
  member_message text,
  draft_text text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  needs_review_flags text[] DEFAULT '{NONE}',
  status text NOT NULL DEFAULT 'pending',
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Calendar Entries — events, reminders, scheduled posts
CREATE TABLE IF NOT EXISTS calendar_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  source text,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Content Ideas — gaps, opportunities, asset drafts
CREATE TABLE IF NOT EXISTS content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  suggested_format text,
  related_members text[] DEFAULT '{}',
  related_threads text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Community Pulse Runs — one snapshot per brief
CREATE TABLE IF NOT EXISTS community_pulse_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  recurring_questions jsonb DEFAULT '[]',
  emotional_temperature text,
  secret_worry text,
  who_is_showing_up jsonb DEFAULT '[]',
  leaderboard_movement jsonb DEFAULT '[]',
  win_of_the_day jsonb,
  open_loops jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Morning Posts — drafted posts for the 12:30 and 7:00 slots
CREATE TABLE IF NOT EXISTS morning_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  brief_id uuid REFERENCES brief_logs(id) ON DELETE CASCADE,
  slot text NOT NULL,
  title text NOT NULL,
  draft_text text NOT NULL,
  call_to_action text,
  is_alternate boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'drafted',
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for common queries
-- =============================================
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_priority ON action_items(priority);
CREATE INDEX IF NOT EXISTS idx_action_items_brief ON action_items(brief_id);
CREATE INDEX IF NOT EXISTS idx_draft_replies_status ON draft_replies(status);
CREATE INDEX IF NOT EXISTS idx_draft_replies_brief ON draft_replies(brief_id);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_start ON calendar_entries(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_entries_brief ON calendar_entries(brief_id);
CREATE INDEX IF NOT EXISTS idx_content_ideas_status ON content_ideas(status);
CREATE INDEX IF NOT EXISTS idx_content_ideas_category ON content_ideas(category);
CREATE INDEX IF NOT EXISTS idx_brief_logs_run_id ON brief_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_brief_logs_date ON brief_logs(brief_date);

-- =============================================
-- RLS Policies (open read for authenticated, write via service role)
-- =============================================
ALTER TABLE brief_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_pulse_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE morning_posts ENABLE ROW LEVEL SECURITY;

-- Allow all reads (single-user app, auth currently disabled)
CREATE POLICY "Allow all reads on brief_logs" ON brief_logs FOR SELECT USING (true);
CREATE POLICY "Allow all reads on action_items" ON action_items FOR SELECT USING (true);
CREATE POLICY "Allow all reads on draft_replies" ON draft_replies FOR SELECT USING (true);
CREATE POLICY "Allow all reads on calendar_entries" ON calendar_entries FOR SELECT USING (true);
CREATE POLICY "Allow all reads on content_ideas" ON content_ideas FOR SELECT USING (true);
CREATE POLICY "Allow all reads on community_pulse_runs" ON community_pulse_runs FOR SELECT USING (true);
CREATE POLICY "Allow all reads on morning_posts" ON morning_posts FOR SELECT USING (true);

-- Allow all writes (service role bypasses RLS, but for the app UI too)
CREATE POLICY "Allow all writes on brief_logs" ON brief_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on action_items" ON action_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on draft_replies" ON draft_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on calendar_entries" ON calendar_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on content_ideas" ON content_ideas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on community_pulse_runs" ON community_pulse_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all writes on morning_posts" ON morning_posts FOR ALL USING (true) WITH CHECK (true);
