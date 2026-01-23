-- Enable RLS but allow all operations for single-user tool
ALTER TABLE public.quick_responses ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (single-user, no auth needed)
CREATE POLICY "Allow all operations for single user tool"
  ON public.quick_responses
  FOR ALL
  USING (true)
  WITH CHECK (true);