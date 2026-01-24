-- Create classroom resources table
CREATE TABLE public.classroom_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  skill_level TEXT DEFAULT 'beginner',
  keywords TEXT[],
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.classroom_resources ENABLE ROW LEVEL SECURITY;

-- Create policy for single user tool
CREATE POLICY "Allow all operations for single user tool"
  ON public.classroom_resources FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_classroom_category ON public.classroom_resources(category);
CREATE INDEX idx_classroom_keywords ON public.classroom_resources USING GIN(keywords);