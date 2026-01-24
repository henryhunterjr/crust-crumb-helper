-- Create dm_templates table for saved message patterns
CREATE TABLE public.dm_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  outreach_type TEXT NOT NULL DEFAULT 'custom',
  description TEXT,
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.dm_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for single user tool
CREATE POLICY "Allow all operations for single user tool"
ON public.dm_templates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dm_templates_updated_at
BEFORE UPDATE ON public.dm_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();