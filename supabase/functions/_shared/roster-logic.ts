// Roster ingestion logic — pure, runtime-neutral, dependency-free.
//
// This is the single source of truth for how a scheduled Skool roster read
// turns into rows in the `members` table. It mirrors the CSV importer in
// src/hooks/useMembers.ts (importMembers) and src/config/segmentation.ts so
// that an automatic roster sync produces the SAME member rows and engagement
// statuses a manual CSV import would. Both the ingest-roster edge function
// (Deno) and the vitest test import this file, so the behaviour can be proven
// without a live database.
//
// One deliberate improvement over the raw CSV path: updates are PARTIAL.
// The roster reader may not see every field for every member (Skool hides
// application answers and activity counts in places the directory does not
// expose). On update we only write fields we actually read, so a sync never
// wipes an application_answer or zeroes a post count we simply could not see.
// Inserts still mirror the CSV importer exactly. Outreach/message state is
// never touched here, so re-syncing never undoes welcome progress.

export const SEGMENTATION_THRESHOLDS = {
  /** Days since join with zero activity before marking "Never Engaged" */
  neverEngagedDays: 7,
  /** Days since last activity before marking "At Risk" (must also have prior activity) */
  atRiskDays: 14,
  /** Days since last activity before marking "Inactive" */
  inactiveDays: 30,
  /** Days within which a member is considered "Active" */
  activeDays: 7,
  /** Days since join without outreach to flag "Needs Welcome" */
  needsWelcomeDays: 3,
  /** Days to consider a member "Joined This Week" */
  joinedThisWeekDays: 7,
} as const;

export type EngagementStatus =
  | "never_engaged"
  | "at_risk"
  | "inactive"
  | "active"
  | "unknown";

/** One member as read from the Skool roster. Mirrors MemberImportRow. */
export interface RosterMemberInput {
  name: string;
  skoolUsername?: string | null;
  email?: string | null;
  joinDate?: string | null; // YYYY-MM-DD
  applicationAnswer?: string | null;
  posts?: number | null;
  comments?: number | null;
  lastActive?: string | null; // YYYY-MM-DD
  profileUrl?: string | null;
  /**
   * Structured intake answers keyed by question id (e.g. q1, q3). Append-only;
   * later runs merge into the existing map last-write-wins per key. The reader
   * only sets keys it actually saw.
   */
  intentRaw?: Record<string, string> | null;
}

/** Existing member row, the subset we need for matching. */
export interface ExistingMember {
  id: string;
  skool_name: string;
  skool_username?: string | null;
}

/** Fields the sync may write to `members`. */
export interface MemberWriteData {
  skool_name?: string;
  skool_username?: string | null;
  email?: string | null;
  join_date?: string | null;
  application_answer?: string | null;
  post_count?: number;
  comment_count?: number;
  last_active?: string | null;
  engagement_status?: EngagementStatus;
  intent_raw?: Record<string, string> | null;
  intent_tier?: string | null;
}

// ---------------------------------------------------------------------------
// Q3 business-intent mapping. Exact-match (case-insensitive, trimmed) against
// the three known Skool option strings. Anything else stays null and gets
// flagged for manual review in /admin.
// ---------------------------------------------------------------------------
const INTENT_TIER_BY_Q3: Record<string, "hobbyist" | "curious" | "prospect"> = {
  "i'm baking mostly for myself and the people i love": "hobbyist",
  "i've wondered about selling what i bake, but i haven't really looked into it":
    "curious",
  "i'm thinking about one day selling what i bake": "prospect",
};

export function deriveIntentTier(
  intentRaw: Record<string, string> | null | undefined,
): "hobbyist" | "curious" | "prospect" | null {
  const q3 = intentRaw?.q3;
  if (!q3) return null;
  const key = q3.replace(/\s+/g, " ").trim().toLowerCase();
  return INTENT_TIER_BY_Q3[key] ?? null;
}

export interface RosterSyncPlan {
  toInsert: MemberWriteData[];
  toUpdate: { id: string; updates: MemberWriteData }[];
  /** ids of existing members not seen in this run (only when fullRoster) */
  missingIds: string[];
  /** ids matched and seen this run */
  seenIds: string[];
  skipped: number;
}

// date-fns differenceInDays(left, right) returns the number of whole days
// between, signed left-right, truncated toward zero. For the date-only
// (midnight) values used here that equals the calendar-day difference, so
// engagement buckets come out identical to useMembers.ts.
export function differenceInDays(left: Date, right: Date): number {
  return Math.trunc((left.getTime() - right.getTime()) / 86_400_000);
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function present(v: unknown): boolean {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function norm(s?: string | null): string {
  // Collapse all whitespace (incl. non-breaking spaces, which Skool uses
  // between first and last name) to single regular spaces, so a name read
  // from the directory matches the same name stored with regular spaces.
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Engagement status, byte-for-byte the same branch order as
 * useMembers.ts importMembers.
 */
export function computeEngagementStatus(
  row: RosterMemberInput,
  now: Date,
): EngagementStatus {
  const joinDate = parseDate(row.joinDate);
  const lastActive = parseDate(row.lastActive);
  const postCount = row.posts || 0;
  const commentCount = row.comments || 0;

  let engagementStatus: EngagementStatus = "unknown";

  if (lastActive) {
    const daysSinceActive = differenceInDays(now, lastActive);
    if (daysSinceActive <= SEGMENTATION_THRESHOLDS.activeDays) {
      engagementStatus = "active";
    } else if (daysSinceActive > SEGMENTATION_THRESHOLDS.inactiveDays) {
      engagementStatus = "inactive";
    } else if (
      daysSinceActive > SEGMENTATION_THRESHOLDS.atRiskDays &&
      (postCount > 0 || commentCount > 0)
    ) {
      engagementStatus = "at_risk";
    }
  } else if (joinDate && postCount === 0 && commentCount === 0) {
    engagementStatus = "unknown";
  }

  return engagementStatus;
}

/** Full row for a NEW member. Mirrors the CSV importer's memberData. */
export function buildInsert(row: RosterMemberInput, now: Date): MemberWriteData {
  const intentRaw = row.intentRaw && Object.keys(row.intentRaw).length > 0
    ? row.intentRaw
    : null;
  return {
    skool_name: row.name,
    skool_username: row.skoolUsername || null,
    email: row.email || null,
    join_date: row.joinDate || null,
    application_answer: row.applicationAnswer || null,
    post_count: row.posts || 0,
    comment_count: row.comments || 0,
    last_active: row.lastActive || null,
    engagement_status: computeEngagementStatus(row, now),
    intent_raw: intentRaw,
    intent_tier: deriveIntentTier(intentRaw),
  };
}

/**
 * PARTIAL update for an existing member: only fields the reader actually
 * captured. Never sets a field to null/0 just because the read missed it.
 * engagement_status is recomputed only when there is an activity signal
 * (lastActive, or posts/comments) in the row.
 */
export function buildUpdate(row: RosterMemberInput, now: Date): MemberWriteData {
  const u: MemberWriteData = {};
  if (present(row.skoolUsername)) u.skool_username = row.skoolUsername as string;
  if (present(row.email)) u.email = row.email as string;
  if (present(row.joinDate)) u.join_date = row.joinDate as string;
  if (present(row.applicationAnswer)) {
    u.application_answer = row.applicationAnswer as string;
  }
  if (row.posts !== undefined && row.posts !== null) u.post_count = row.posts;
  if (row.comments !== undefined && row.comments !== null) {
    u.comment_count = row.comments;
  }
  if (present(row.lastActive)) u.last_active = row.lastActive as string;

  const hasActivitySignal = present(row.lastActive) ||
    (row.posts !== undefined && row.posts !== null) ||
    (row.comments !== undefined && row.comments !== null);
  if (hasActivitySignal) u.engagement_status = computeEngagementStatus(row, now);

  // intent_raw is merged in the caller (ingest-roster) because we need the
  // existing row's intent_raw to do an append-only merge. Here we only signal
  // that this row carries new intent keys.
  if (row.intentRaw && Object.keys(row.intentRaw).length > 0) {
    u.intent_raw = row.intentRaw;
  }

  return u;
}

/**
 * Decide inserts, updates, and (when fullRoster) which existing members are
 * no longer on the roster. Matching prefers a stable skool_username and falls
 * back to lowercased skool_name, which keeps faith with the CSV importer's
 * name match while preventing duplicate rows when a display name changes.
 * Nothing is deleted; missing members are returned for the caller to flag.
 */
export function planRosterSync(
  rows: RosterMemberInput[],
  existing: ExistingMember[],
  now: Date,
  opts: { fullRoster?: boolean } = {},
): RosterSyncPlan {
  const byUsername = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const m of existing) {
    if (present(m.skool_username)) byUsername.set(norm(m.skool_username), m.id);
    byName.set(norm(m.skool_name), m.id);
  }

  const seen = new Set<string>();
  const toInsert: MemberWriteData[] = [];
  const toUpdate: { id: string; updates: MemberWriteData }[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (!present(row.name)) {
      skipped++;
      continue;
    }

    let id: string | undefined;
    if (present(row.skoolUsername) && byUsername.has(norm(row.skoolUsername))) {
      id = byUsername.get(norm(row.skoolUsername));
    } else {
      id = byName.get(norm(row.name));
    }

    if (id) {
      seen.add(id);
      toUpdate.push({ id, updates: buildUpdate(row, now) });
    } else {
      toInsert.push(buildInsert(row, now));
    }
  }

  const missingIds = opts.fullRoster
    ? existing.filter((m) => !seen.has(m.id)).map((m) => m.id)
    : [];

  return {
    toInsert,
    toUpdate,
    missingIds,
    seenIds: [...seen],
    skipped,
  };
}
