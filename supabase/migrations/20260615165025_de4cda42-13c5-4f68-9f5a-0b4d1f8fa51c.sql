ALTER TABLE public.recipes              ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.classroom_resources  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.blog_posts           ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.youtube_videos       ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_recipes_source             ON public.recipes(source);
CREATE INDEX IF NOT EXISTS idx_classroom_resources_source ON public.classroom_resources(source);
CREATE INDEX IF NOT EXISTS idx_blog_posts_source          ON public.blog_posts(source);
CREATE INDEX IF NOT EXISTS idx_youtube_videos_source      ON public.youtube_videos(source);