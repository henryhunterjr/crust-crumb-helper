
-- ============================================
-- WEEKLY GOALS: Track weekly targets and progress
-- ============================================
CREATE TABLE public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  goal_type text NOT NULL, -- 'welcome', 'reengage', 'respond', 'content'
  goal_label text NOT NULL,
  target_count integer NOT NULL DEFAULT 0,
  current_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.weekly_goals FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON public.weekly_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- MEMBER TAGS: Auto and manual tags for members
-- ============================================
CREATE TABLE public.member_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tag text NOT NULL,
  source text NOT NULL DEFAULT 'manual', -- 'auto' or 'manual'
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.member_tags FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX idx_member_tags_unique ON public.member_tags(member_id, tag);

-- ============================================
-- INTEREST MAPPINGS: Keyword-to-resource mappings for AI personalization
-- ============================================
CREATE TABLE public.interest_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text[] NOT NULL DEFAULT '{}',
  recommended_course text,
  recommended_recipe text,
  quick_win text,
  book_link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.interest_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.interest_mappings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_interest_mappings_updated_at BEFORE UPDATE ON public.interest_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CONTENT CAMPAIGNS: Bake-along and event campaign plans
-- ============================================
CREATE TABLE public.content_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'bake_along',
  title text NOT NULL,
  bread_name text,
  event_date date,
  promotion_days integer NOT NULL DEFAULT 7,
  status text NOT NULL DEFAULT 'draft', -- draft, active, completed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.content_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_content_campaigns_updated_at BEFORE UPDATE ON public.content_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CAMPAIGN POSTS: Individual posts within a campaign
-- ============================================
CREATE TABLE public.campaign_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.content_campaigns(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  time_slot text NOT NULL, -- '12:30' or '19:00'
  post_type text NOT NULL, -- 'value' or 'engagement'
  theme text,
  title text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'not_started', -- not_started, drafted, scheduled, posted
  scheduled_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.campaign_posts FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_campaign_posts_updated_at BEFORE UPDATE ON public.campaign_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- URL HEALTH CHECKS: Track verification status of all URLs
-- ============================================
CREATE TABLE public.url_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  source_type text NOT NULL, -- 'classroom_resource', 'recipe', 'course_module'
  source_id uuid,
  status_code integer,
  is_healthy boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  error_message text,
  fallback_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.url_health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.url_health_checks FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX idx_url_health_unique ON public.url_health_checks(url);
CREATE TRIGGER update_url_health_updated_at BEFORE UPDATE ON public.url_health_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ACTIVITY FEED: Track community events
-- ============================================
CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type text NOT NULL, -- 'member_joined', 'member_welcomed', 'member_responded', 'outreach_sent', 'course_completed', 'member_returned'
  title text NOT NULL,
  description text,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.activity_feed FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- EMAIL SUBSCRIBERS: MailPoet import and cross-reference
-- ============================================
CREATE TABLE public.email_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text,
  last_name text,
  status text NOT NULL DEFAULT 'subscribed', -- subscribed, unsubscribed
  is_skool_member boolean NOT NULL DEFAULT false,
  matched_member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  source text DEFAULT 'mailpoet',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.email_subscribers FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX idx_email_subscribers_email ON public.email_subscribers(email);
CREATE TRIGGER update_email_subscribers_updated_at BEFORE UPDATE ON public.email_subscribers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- OUTREACH RULES: Configurable automation triggers
-- ============================================
CREATE TABLE public.outreach_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL, -- 'welcome', 'at_risk', 'reengage', 'auto_tag'
  condition_field text NOT NULL, -- 'days_since_join', 'days_inactive', etc.
  condition_operator text NOT NULL DEFAULT 'gte', -- 'gte', 'lte', 'eq'
  condition_value integer NOT NULL,
  action_type text NOT NULL, -- 'generate_dm', 'flag_status', 'add_tag'
  action_value text, -- dm type, status name, tag name
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.outreach_rules FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_outreach_rules_updated_at BEFORE UPDATE ON public.outreach_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AI PERSONALITY: Writing voice preferences
-- ============================================
CREATE TABLE public.ai_personality_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_personality_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.ai_personality_settings FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_ai_personality_updated_at BEFORE UPDATE ON public.ai_personality_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COURSE MODULES: Detailed classroom content index
-- ============================================
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.classroom_resources(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text,
  topics text[] DEFAULT '{}',
  url_verified boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.course_modules FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_course_modules_updated_at BEFORE UPDATE ON public.course_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Add new columns to existing tables
-- ============================================

-- Members: add priority_score for outreach queue
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS priority_score integer DEFAULT 0;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'low'; -- 'high', 'medium', 'low'

-- Recipes: add dual-link support and enhanced metadata
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS skool_url text;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS share_url text;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS uses_discard boolean DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS related_course text;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS url_verified boolean DEFAULT false;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- Classroom resources: add verification tracking
ALTER TABLE public.classroom_resources ADD COLUMN IF NOT EXISTS url_verified boolean DEFAULT false;
ALTER TABLE public.classroom_resources ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;
ALTER TABLE public.classroom_resources ADD COLUMN IF NOT EXISTS parent_course_url text;
ALTER TABLE public.classroom_resources ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Outreach messages: add priority field
ALTER TABLE public.outreach_messages ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';

-- Scheduled posts: add campaign reference
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.content_campaigns(id) ON DELETE SET NULL;
ALTER TABLE public.scheduled_posts ADD COLUMN IF NOT EXISTS day_theme text;
