CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  series TEXT,
  skill_level TEXT DEFAULT 'beginner',
  keywords TEXT[],
  duration TEXT,
  published_at DATE,
  url_verified BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON public.youtube_videos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "DEV public full access" ON public.youtube_videos
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_youtube_videos_updated_at
  BEFORE UPDATE ON public.youtube_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_youtube_videos_keywords ON public.youtube_videos USING GIN(keywords);
CREATE INDEX idx_youtube_videos_series ON public.youtube_videos(series);