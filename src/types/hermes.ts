export type HermesJobType =
  | 'weekly_welcome_post'
  | 'daily_reengagement_dms'
  | 'weekly_analytics_brief'
  | 'weekly_newsletter_draft';

export interface HermesJob {
  id: string;
  job_type: HermesJobType;
  display_name: string;
  description: string | null;
  schedule_cron: string;
  schedule_label: string;
  enabled: boolean;
  auto_send: boolean;
  config: Record<string, unknown>;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_summary: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HermesJobRun {
  id: string;
  job_id: string;
  job_type: string;
  trigger: string;
  dry_run: boolean;
  status: string;
  items_processed: number;
  items_succeeded: number;
  items_failed: number;
  summary: string | null;
  details: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
}