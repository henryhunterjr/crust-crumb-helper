-- Member Compass: additive member-intelligence storage.
-- Existing member, outreach and roster data remain unchanged.

CREATE TABLE IF NOT EXISTS public.member_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES public.members(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_url text,
  source_external_id text,
  source_author text,
  source_username text,
  source_text text NOT NULL CHECK (length(trim(source_text)) > 0),
  captured_at timestamptz,
  match_status text NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('matched','ambiguous','unmatched')),
  match_confidence numeric CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_url, source_external_id)
);

CREATE INDEX IF NOT EXISTS idx_member_sources_member_id
  ON public.member_sources(member_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_sources_match_status
  ON public.member_sources(match_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_sources_author
  ON public.member_sources(lower(source_username), lower(source_author));

CREATE TABLE IF NOT EXISTS public.member_compass_profiles (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  baking_stage text NOT NULL DEFAULT 'unknown'
    CHECK (baking_stage IN ('new','developing','confident','advanced','unknown')),
  struggles text[] NOT NULL DEFAULT '{}'::text[],
  learning_goals text[] NOT NULL DEFAULT '{}'::text[],
  bread_interests text[] NOT NULL DEFAULT '{}'::text[],
  why_they_bake text,
  personal_hooks text[] NOT NULL DEFAULT '{}'::text[],
  member_language text[] NOT NULL DEFAULT '{}'::text[],
  next_best_action text,
  recommended_resource_type text,
  recommended_resource_title text,
  recommended_resource_url text,
  insight_confidence numeric CHECK (insight_confidence IS NULL OR (insight_confidence >= 0 AND insight_confidence <= 1)),
  source_summary text,
  manually_edited boolean NOT NULL DEFAULT false,
  last_analyzed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compass_stage ON public.member_compass_profiles(baking_stage);
CREATE INDEX IF NOT EXISTS idx_compass_struggles ON public.member_compass_profiles USING gin(struggles);
CREATE INDEX IF NOT EXISTS idx_compass_goals ON public.member_compass_profiles USING gin(learning_goals);
CREATE INDEX IF NOT EXISTS idx_compass_interests ON public.member_compass_profiles USING gin(bread_interests);
CREATE INDEX IF NOT EXISTS idx_compass_last_analyzed ON public.member_compass_profiles(last_analyzed_at DESC NULLS LAST);

ALTER TABLE public.member_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_compass_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access" ON public.member_sources;
CREATE POLICY "Admins full access" ON public.member_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins full access" ON public.member_compass_profiles;
CREATE POLICY "Admins full access" ON public.member_compass_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON TABLE public.member_sources, public.member_compass_profiles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_sources, public.member_compass_profiles TO authenticated, service_role;
