CREATE TABLE public.member_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NULL REFERENCES public.members(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'introduction',
  source_url TEXT,
  source_external_id TEXT,
  source_author TEXT,
  source_author_username TEXT,
  source_text TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC,
  match_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_sources_member ON public.member_sources(member_id);
CREATE INDEX idx_member_sources_status ON public.member_sources(match_status);
CREATE UNIQUE INDEX idx_member_sources_dedupe
  ON public.member_sources(source_external_id)
  WHERE source_external_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_sources TO authenticated;
GRANT ALL ON public.member_sources TO service_role;
ALTER TABLE public.member_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON public.member_sources
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_member_sources_updated_at
  BEFORE UPDATE ON public.member_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.member_compass_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  baking_stage TEXT NOT NULL DEFAULT 'unknown',
  struggles TEXT[] NOT NULL DEFAULT '{}',
  learning_goals TEXT[] NOT NULL DEFAULT '{}',
  bread_interests TEXT[] NOT NULL DEFAULT '{}',
  why_they_bake TEXT,
  personal_hooks TEXT[] NOT NULL DEFAULT '{}',
  member_language TEXT[] NOT NULL DEFAULT '{}',
  next_best_action TEXT,
  recommended_resource_type TEXT,
  recommended_resource_title TEXT,
  recommended_resource_url TEXT,
  insight_confidence TEXT NOT NULL DEFAULT 'low',
  source_summary TEXT,
  manually_edited BOOLEAN NOT NULL DEFAULT false,
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT member_compass_stage_check CHECK (baking_stage IN ('new','developing','confident','advanced','unknown'))
);

CREATE INDEX idx_member_compass_stage ON public.member_compass_profiles(baking_stage);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_compass_profiles TO authenticated;
GRANT ALL ON public.member_compass_profiles TO service_role;
ALTER TABLE public.member_compass_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins full access" ON public.member_compass_profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_member_compass_profiles_updated_at
  BEFORE UPDATE ON public.member_compass_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();