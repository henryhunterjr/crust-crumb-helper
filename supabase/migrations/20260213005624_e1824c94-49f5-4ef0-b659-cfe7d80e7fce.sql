
-- Add Phase 2 columns to quick_responses table
ALTER TABLE public.quick_responses 
  ADD COLUMN IF NOT EXISTS topic_tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_course_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS related_recipe_ids text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS search_hit_count integer DEFAULT 0;

-- Add indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_quick_responses_topic_tags ON public.quick_responses USING GIN(topic_tags);
CREATE INDEX IF NOT EXISTS idx_member_tags_member_id ON public.member_tags(member_id);
CREATE INDEX IF NOT EXISTS idx_member_tags_tag ON public.member_tags(tag);
CREATE INDEX IF NOT EXISTS idx_interest_mappings_keywords ON public.interest_mappings USING GIN(keywords);
