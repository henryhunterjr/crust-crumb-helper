export type EngagementStatus = 'never_engaged' | 'at_risk' | 'inactive' | 'active' | 'unknown';

export type MessageStatus = 'not_contacted' | 'message_generated' | 'sent' | 'replied';

export type OutreachType = 'welcome_message' | 'resource_recommendation' | 'feedback_request' | 'custom';

export type IntentTier = 'hobbyist' | 'curious' | 'prospect';

export type NurtureStatus = 'active' | 'paused' | 'opted_out' | 'customer';

export interface IntentRaw {
  q1?: string;
  q3?: string;
  [key: string]: string | undefined;
}

export interface Member {
  id: string;
  skool_name: string;
  skool_username: string | null;
  email: string | null;
  join_date: string | null;
  application_answer: string | null;
  post_count: number;
  comment_count: number;
  last_active: string | null;
  engagement_status: EngagementStatus;
  message_status: MessageStatus;
  outreach_sent: boolean;
  outreach_sent_at: string | null;
  outreach_responded: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  intent_raw?: IntentRaw | null;
  intent_tier?: IntentTier | null;
  nurture_status?: NurtureStatus;
  last_business_touch?: string | null;
  business_touch_count?: number;
  invited_to_sys?: boolean;
  invited_to_sys_at?: string | null;
}

export interface MemberImportRow {
  name: string;
  skoolUsername?: string;
  email?: string;
  joinDate?: string;
  applicationAnswer?: string;
  posts?: number;
  comments?: number;
  lastActive?: string;
}

export type MemberFilter = 'all' | 'never_engaged' | 'at_risk' | 'inactive' | 'needs_outreach' | 'has_goals' | 'no_goals' | 'joined_this_week' | 'needs_welcome';

export type MemberSortField = 'join_date' | 'last_active' | 'engagement_status';
