-- Create post_ideas table for storing generated posts
CREATE TABLE public.post_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT,
  target_audience TEXT,
  topic TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.post_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for single user tool"
  ON public.post_ideas FOR ALL USING (true) WITH CHECK (true);

-- Create scheduled_posts table for content calendar
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  time_slot TEXT, -- 'morning', 'afternoon', 'evening'
  post_type TEXT,
  status TEXT DEFAULT 'planned', -- 'planned', 'posted', 'skipped'
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for single user tool"
  ON public.scheduled_posts FOR ALL USING (true) WITH CHECK (true);