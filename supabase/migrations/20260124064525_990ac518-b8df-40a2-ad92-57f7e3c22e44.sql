-- Create the recipes table
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  skill_level TEXT DEFAULT 'beginner',
  keywords TEXT[],
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for single user tool"
  ON public.recipes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_recipes_category ON public.recipes(category);
CREATE INDEX idx_recipes_keywords ON public.recipes USING GIN(keywords);