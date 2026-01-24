export type EngagementStatus = 'never_engaged' | 'at_risk' | 'inactive' | 'active' | 'unknown';

export type OutreachType = 'resource_recommendation' | 'feedback_request';

export interface Member {
  id: string;
  skool_name: string;
  email: string | null;
  join_date: string | null;
  application_answer: string | null;
  post_count: number;
  comment_count: number;
  last_active: string | null;
  engagement_status: EngagementStatus;
  outreach_sent: boolean;
  outreach_sent_at: string | null;
  outreach_responded: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberImportRow {
  name: string;
  email?: string;
  joinDate?: string;
  applicationAnswer?: string;
  posts?: number;
  comments?: number;
  lastActive?: string;
}

export type MemberFilter = 'all' | 'never_engaged' | 'at_risk' | 'inactive' | 'needs_outreach' | 'has_goals' | 'no_goals';

export type MemberSortField = 'join_date' | 'last_active' | 'engagement_status';
