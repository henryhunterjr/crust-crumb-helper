export type BakingStage = 'new' | 'developing' | 'confident' | 'advanced' | 'unknown';

export type InsightConfidence = 'low' | 'medium' | 'high';

export type MatchStatus = 'matched' | 'ambiguous' | 'unmatched' | 'ignored';

export interface MemberCompassProfile {
  id: string;
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
  insight_confidence: InsightConfidence;
  source_summary: string | null;
  manually_edited: boolean;
  last_analyzed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberSource {
  id: string;
  member_id: string | null;
  source_type: string;
  source_url: string | null;
  source_external_id: string | null;
  source_author: string | null;
  source_author_username: string | null;
  source_text: string;
  captured_at: string;
  match_status: MatchStatus;
  match_confidence: number | null;
  match_note: string | null;
  created_at: string;
  updated_at: string;
}

/** One record coming in from JSON / CSV / pasted text, before it is committed. */
export interface IncomingSource {
  author?: string;
  username?: string;
  text: string;
  url?: string;
  externalId?: string;
  capturedAt?: string;
  sourceType?: string;
}

/** A previewed row: the incoming record plus the match decision. */
export interface PreviewRow extends IncomingSource {
  matchStatus: MatchStatus;
  matchedMemberId: string | null;
  matchedMemberName: string | null;
  matchConfidence: number;
  matchNote: string;
  candidates: { id: string; name: string }[];
}

export const STAGE_LABELS: Record<BakingStage, string> = {
  new: 'Brand new',
  developing: 'Developing',
  confident: 'Confident',
  advanced: 'Advanced',
  unknown: 'Unknown',
};
