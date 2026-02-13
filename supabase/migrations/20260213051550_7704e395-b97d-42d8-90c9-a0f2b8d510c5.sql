
-- Calendar templates for 4-week rotation
CREATE TABLE public.calendar_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  slot_time TEXT NOT NULL,
  slot_type TEXT NOT NULL,
  template_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.calendar_templates FOR ALL USING (true) WITH CHECK (true);

-- Weekly reports storage
CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_score INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for single user tool" ON public.weekly_reports FOR ALL USING (true) WITH CHECK (true);

-- Index for calendar templates lookup
CREATE INDEX idx_calendar_templates_week ON public.calendar_templates(week_number, day_of_week);

-- Index for weekly reports date range
CREATE INDEX idx_weekly_reports_dates ON public.weekly_reports(week_start);
