-- Add index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date ON public.scheduled_posts(scheduled_date);