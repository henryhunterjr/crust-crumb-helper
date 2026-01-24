import { OutreachType } from './member';

export interface DMTemplate {
  id: string;
  name: string;
  content: string;
  outreach_type: OutreachType;
  description: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}
