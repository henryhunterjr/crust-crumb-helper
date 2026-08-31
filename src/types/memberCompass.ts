export type BakingStage = 'new' | 'developing' | 'confident' | 'advanced' | 'unknown';
export type MemberSourceType = 'introduction_thread' | 'application' | 'manual_note' | 'other';
export type MemberSourceMatchStatus = 'matched' | 'ambiguous' | 'unmatched';

export interface MemberSource {
  id: string;
  member_id: string | null;
  source_type: MemberSourceType | string;
  source_url: string | null;
  source_external_id: string | null;
  source_author: string | null;
  source_username: string | null;
  source_text: string;
  captured_at: string | null;
  match_status: MemberSourceMatchStatus;
  match_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface MemberCompassProfile {
  member_id: string;
  baking_stage: BakingStage;
  struggles: string[];
  learning_goals: string[];
  bread_interests: string[];
  why_they_bake: string | null;
  personal_hooks: string[];
  member_language: string[];
  next_best_action: string | null;
  recommended_resource_type: string | null;
  recommended_resource_title: string | null;
  recommended_resource_url: string | null;
  insight_confidence: number | null;
  source_summary: string | null;
  manually_edited: boolean;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntroductionCaptureRow {
  author: string;
  username?: string | null;
  text: string;
  sourceUrl?: string | null;
  externalId?: string | null;
  capturedAt?: string | null;
}

export interface IntroductionPreviewRow extends IntroductionCaptureRow {
  key: string;
  memberId: string | null;
  memberName: string | null;
  matchStatus: MemberSourceMatchStatus;
  matchConfidence: number | null;
  selectedMemberId?: string | null;
}

export interface MemberCompassOpportunity {
  topic: string;
  count: number;
  memberIds: string[];
  resourceTitle?: string | null;
  resourceUrl?: string | null;
}
