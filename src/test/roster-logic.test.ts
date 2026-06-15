import { describe, it, expect } from "vitest";
import { differenceInDays as dfnsDiff, parseISO } from "date-fns";
import {
  buildInsert,
  buildUpdate,
  computeEngagementStatus,
  differenceInDays,
  planRosterSync,
  SEGMENTATION_THRESHOLDS,
  type RosterMemberInput,
} from "../../supabase/functions/_shared/roster-logic";

// Fixed "now" so the day math is deterministic. Midday avoids any
// boundary ambiguity between the roster logic and date-fns.
const NOW = new Date("2026-06-13T12:00:00.000Z");

function daysAgo(n: number): string {
  const d = new Date(NOW.getTime() - n * 86_400_000);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Reference implementation copied verbatim from src/hooks/useMembers.ts
 * (importMembers). The roster logic must produce the same engagement_status
 * and the same memberData for a fresh insert.
 */
function referenceImport(row: RosterMemberInput, today: Date) {
  const lastActive = row.lastActive ? parseISO(row.lastActive) : null;
  const joinDate = row.joinDate ? parseISO(row.joinDate) : null;
  const postCount = row.posts || 0;
  const commentCount = row.comments || 0;

  let engagementStatus = "unknown";
  if (lastActive) {
    const daysSinceActive = dfnsDiff(today, lastActive);
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

  return {
    skool_name: row.name,
    skool_username: row.skoolUsername || null,
    email: row.email || null,
    join_date: row.joinDate || null,
    application_answer: row.applicationAnswer || null,
    post_count: postCount,
    comment_count: commentCount,
    last_active: row.lastActive || null,
    engagement_status: engagementStatus,
  };
}

describe("differenceInDays matches date-fns for date-only inputs", () => {
  for (const n of [0, 1, 7, 8, 14, 15, 30, 31, 90]) {
    it(`agrees at ${n} days ago`, () => {
      const d = parseISO(daysAgo(n));
      expect(differenceInDays(NOW, d)).toBe(dfnsDiff(NOW, d));
    });
  }
});

describe("computeEngagementStatus mirrors the CSV importer", () => {
  const cases: { label: string; row: RosterMemberInput; expected: string }[] = [
    { label: "active in last 7d", row: { name: "A", lastActive: daysAgo(3), posts: 2 }, expected: "active" },
    { label: "exactly 7d still active", row: { name: "B", lastActive: daysAgo(7) }, expected: "active" },
    { label: "8d, gap zone -> unknown", row: { name: "C", lastActive: daysAgo(8), posts: 5 }, expected: "unknown" },
    { label: "20d with activity -> at_risk", row: { name: "D", lastActive: daysAgo(20), posts: 1 }, expected: "at_risk" },
    { label: "20d no activity -> unknown", row: { name: "E", lastActive: daysAgo(20), posts: 0, comments: 0 }, expected: "unknown" },
    { label: "40d -> inactive", row: { name: "F", lastActive: daysAgo(40), posts: 9 }, expected: "inactive" },
    { label: "fresh joiner, no activity -> unknown", row: { name: "G", joinDate: daysAgo(1), posts: 0, comments: 0 }, expected: "unknown" },
    { label: "no data at all -> unknown", row: { name: "H" }, expected: "unknown" },
  ];
  for (const c of cases) {
    it(c.label, () => {
      expect(computeEngagementStatus(c.row, NOW)).toBe(c.expected);
      // and it agrees with the reference importer
      expect(computeEngagementStatus(c.row, NOW)).toBe(
        referenceImport(c.row, NOW).engagement_status,
      );
    });
  }
});

describe("buildInsert mirrors the CSV importer memberData exactly", () => {
  const rows: RosterMemberInput[] = [
    { name: "Jane Smith", skoolUsername: "jane", email: "j@x.com", joinDate: daysAgo(2), applicationAnswer: "Sourdough from scratch", posts: 0, comments: 0 },
    { name: "Bob", lastActive: daysAgo(40), posts: 3, comments: 1 },
    { name: "No Data Dan" },
  ];
  for (const row of rows) {
    it(`row "${row.name}"`, () => {
      expect(buildInsert(row, NOW)).toEqual(referenceImport(row, NOW));
    });
  }
});

describe("buildUpdate is partial and non-destructive", () => {
  it("omits fields the reader did not capture", () => {
    const u = buildUpdate({ name: "X", skoolUsername: "x" }, NOW);
    // Only username present; nothing that would null out an answer or zero a count.
    expect(u).toEqual({ skool_username: "x" });
    expect("application_answer" in u).toBe(false);
    expect("post_count" in u).toBe(false);
    expect("engagement_status" in u).toBe(false);
  });

  it("writes only what was read, and recomputes status when activity is present", () => {
    const u = buildUpdate({ name: "Y", lastActive: daysAgo(3), posts: 4 }, NOW);
    expect(u.last_active).toBe(daysAgo(3));
    expect(u.post_count).toBe(4);
    expect(u.engagement_status).toBe("active");
    expect("email" in u).toBe(false);
    expect("application_answer" in u).toBe(false);
  });

  it("keeps a captured empty answer out of the update (no wipe)", () => {
    const u = buildUpdate({ name: "Z", applicationAnswer: "   " }, NOW);
    expect("application_answer" in u).toBe(false);
  });
});

describe("planRosterSync inserts, updates, and reconciles", () => {
  const existing = [
    { id: "id-jane", skool_name: "Jane Smith", skool_username: "jane" },
    { id: "id-bob", skool_name: "Bob", skool_username: null },
    { id: "id-gone", skool_name: "Departed Member", skool_username: "gone" },
  ];

  it("matches by username first, then name; inserts the unknown", () => {
    const rows: RosterMemberInput[] = [
      // display name changed, but username still matches -> update id-jane
      { name: "Jane S.", skoolUsername: "jane", lastActive: daysAgo(2) },
      // no username on file, match by name -> update id-bob
      { name: "Bob", posts: 5 },
      // brand new -> insert
      { name: "New Nora", skoolUsername: "nora", joinDate: daysAgo(1), applicationAnswer: "scoring" },
    ];
    const plan = planRosterSync(rows, existing, NOW, { fullRoster: true });

    const updatedIds = plan.toUpdate.map((u) => u.id).sort();
    expect(updatedIds).toEqual(["id-bob", "id-jane"]);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].skool_name).toBe("New Nora");
    // id-gone was not in the read -> flagged missing on a full roster
    expect(plan.missingIds).toEqual(["id-gone"]);
  });

  it("does not flag missing on a partial read", () => {
    const plan = planRosterSync(
      [{ name: "Bob", posts: 1 }],
      existing,
      NOW,
      { fullRoster: false },
    );
    expect(plan.missingIds).toEqual([]);
  });

  it("matches a non-breaking-space name against a regular-space row", () => {
    // Skool renders "Bob" then a non-breaking space; the stored row uses a
    // regular space. They must still be treated as the same person.
    const plan = planRosterSync(
      [{ name: "Bob Smith", posts: 1 }],
      [{ id: "id-bob-smith", skool_name: "Bob Smith", skool_username: null }],
      NOW,
      {},
    );
    expect(plan.toUpdate.map((u) => u.id)).toEqual(["id-bob-smith"]);
    expect(plan.toInsert).toHaveLength(0);
  });

  it("skips nameless rows", () => {
    const plan = planRosterSync(
      [{ name: "" }, { name: "  " }, { name: "Real" }],
      existing,
      NOW,
      {},
    );
    expect(plan.skipped).toBe(2);
    expect(plan.toInsert).toHaveLength(1);
  });
});
