-- Add platform and content strategy fields to scheduled_posts
ALTER TABLE public.scheduled_posts
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'skool',
  ADD COLUMN IF NOT EXISTS content_pillar TEXT,
  ADD COLUMN IF NOT EXISTS framework TEXT,
  ADD COLUMN IF NOT EXISTS source_material TEXT,
  ADD COLUMN IF NOT EXISTS hashtags TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT;

-- Add platform to calendar_templates
ALTER TABLE public.calendar_templates
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'skool',
  ADD COLUMN IF NOT EXISTS content_pillar TEXT,
  ADD COLUMN IF NOT EXISTS framework TEXT,
  ADD COLUMN IF NOT EXISTS source_suggestion TEXT;

-- Create index for platform filtering
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform ON public.scheduled_posts(platform);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_pillar ON public.scheduled_posts(content_pillar);

-- =============================================================
-- Seed: Weekly content strategy templates for Instagram/TikTok
-- These define what shows up as suggestions on each day
-- =============================================================

-- Week 1-4 templates for Instagram Reels + TikTok (Mon-Fri)
-- All 4 weeks follow the same pillar cadence, different template suggestions

-- MONDAY — Pillar 1: "Why It Works" (Science) — Educational tip
INSERT INTO public.calendar_templates (week_number, day_of_week, slot_time, slot_type, template_text, platform, content_pillar, framework, source_suggestion)
VALUES
  (1, 1, '11:00', 'educational', 'Science Monday: Teach ONE technique tip. Hook with a problem, show the fix. 30-45 sec.', 'instagram', 'why-it-works', 'quick-tip', 'Sourdough Starter 101, Reading Fermentation, Cold Kitchen Warm Dough'),
  (2, 1, '11:00', 'educational', 'Science Monday: Pick a course module clip. Find the best 30-sec teaching moment.', 'instagram', 'why-it-works', 'quick-tip', 'The Flour Course, Pre-Ferments, Secret to Controlling Flavor'),
  (3, 1, '11:00', 'educational', 'Science Monday: Troubleshooting tip. What goes wrong and why.', 'instagram', 'why-it-works', 'quick-tip', 'Sourdough Starter 101, Reading Fermentation'),
  (4, 1, '11:00', 'educational', 'Science Monday: Process demo — show hands-on technique. 30-45 sec.', 'instagram', 'why-it-works', 'quick-tip', 'Course modules, YouTube clips')
ON CONFLICT DO NOTHING;

-- TUESDAY — Pillar 2: "No Gatekeeping" (The Stand) — Myth-busting
INSERT INTO public.calendar_templates (week_number, day_of_week, slot_time, slot_type, template_text, platform, content_pillar, framework, source_suggestion)
VALUES
  (1, 2, '11:00', 'entertaining', 'No Gatekeeping Tuesday: Bust a myth. "You don''t need X." Bold claim, then prove it.', 'instagram', 'no-gatekeeping', 'myth-buster', 'Baker''s Percentage Explained, Baker''s Toolkit'),
  (2, 2, '11:00', 'entertaining', 'No Gatekeeping Tuesday: Call out equipment elitism. Show the budget alternative.', 'instagram', 'no-gatekeeping', 'myth-buster', 'Original talking head, voice.md stance'),
  (3, 2, '11:00', 'entertaining', 'No Gatekeeping Tuesday: "Everyone says X, but actually..." Debunk a common baking myth.', 'instagram', 'no-gatekeeping', 'myth-buster', 'Course intros, community questions'),
  (4, 2, '11:00', 'entertaining', 'No Gatekeeping Tuesday: Make something "advanced" feel simple. Baker''s math, hydration, etc.', 'instagram', 'no-gatekeeping', 'myth-buster', 'Baker''s Percentage, any course intro')
ON CONFLICT DO NOTHING;

-- WEDNESDAY — Pillar 3: "From Brick to Beautiful" (Transformation) — Before/After
INSERT INTO public.calendar_templates (week_number, day_of_week, slot_time, slot_type, template_text, platform, content_pillar, framework, source_suggestion)
VALUES
  (1, 3, '11:00', 'community', 'Transformation Wednesday: Before/after story. Show the brick, show the beautiful loaf.', 'instagram', 'from-brick-to-beautiful', 'before-after', 'Member submissions, your own bakes'),
  (2, 3, '11:00', 'community', 'Transformation Wednesday: Member spotlight. Ask a community member to share their progress.', 'instagram', 'from-brick-to-beautiful', 'before-after', 'Saturday bake-along results, community posts'),
  (3, 3, '11:00', 'community', 'Transformation Wednesday: Your own journey — share a failure that became a win.', 'instagram', 'from-brick-to-beautiful', 'before-after', 'Personal story, old photos'),
  (4, 3, '11:00', 'community', 'Transformation Wednesday: "Same baker, same kitchen" — what changed was understanding.', 'instagram', 'from-brick-to-beautiful', 'before-after', 'Tutorials Under Construction, January Challenge')
ON CONFLICT DO NOTHING;

-- THURSDAY — Pillar 1: "Why It Works" (Science) — Process demo
INSERT INTO public.calendar_templates (week_number, day_of_week, slot_time, slot_type, template_text, platform, content_pillar, framework, source_suggestion)
VALUES
  (1, 4, '11:00', 'educational', 'Science Thursday: Hands-on process demo. Show the technique, not just talk about it.', 'instagram', 'why-it-works', 'quick-tip', 'Course modules, bake-along footage'),
  (2, 4, '11:00', 'educational', 'Science Thursday: "Here''s what to look for" — visual cues in dough.', 'instagram', 'why-it-works', 'quick-tip', 'Reading Fermentation, Pre-Ferments'),
  (3, 4, '11:00', 'educational', 'Science Thursday: Temperature, timing, or hydration tip. One variable, one fix.', 'instagram', 'why-it-works', 'quick-tip', 'Cold Kitchen Warm Dough, Controlling Flavor'),
  (4, 4, '11:00', 'educational', 'Science Thursday: Side-by-side comparison. Same recipe, different technique/variable.', 'instagram', 'why-it-works', 'quick-tip', 'Course modules, YouTube demos')
ON CONFLICT DO NOTHING;

-- FRIDAY — Pillar 4: "Bread Is Ritual" (The Soul) — Alternating Saturday teaser / Breaking Bread
INSERT INTO public.calendar_templates (week_number, day_of_week, slot_time, slot_type, template_text, platform, content_pillar, framework, source_suggestion)
VALUES
  (1, 5, '11:00', 'story', 'Ritual Friday: Saturday bake-along teaser. Build anticipation. "Tomorrow we bake together."', 'instagram', 'bread-is-ritual', 'saturday-teaser', 'Bake-along promo, community footage'),
  (2, 5, '11:00', 'story', 'Ritual Friday: Breaking Bread podcast teaser. Rachel Parker tells a bread folklore story.', 'instagram', 'bread-is-ritual', 'breaking-bread-teaser', 'Breaking Bread podcast episodes — use Rachel''s voice + historical images'),
  (3, 5, '11:00', 'story', 'Ritual Friday: Saturday bake-along teaser. "Bakers in 50+ countries, every Saturday."', 'instagram', 'bread-is-ritual', 'saturday-teaser', 'The Loaf and the Lie, bake-along promo'),
  (4, 5, '11:00', 'story', 'Ritual Friday: Breaking Bread podcast teaser. Pull the wildest fact from an episode.', 'instagram', 'bread-is-ritual', 'breaking-bread-teaser', 'Breaking Bread podcast — Executioner''s Loaf, Fungus That Cursed a Village, etc.')
ON CONFLICT DO NOTHING;
