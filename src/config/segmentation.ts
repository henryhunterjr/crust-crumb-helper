/**
 * Configurable thresholds for member engagement segmentation.
 * Adjust these values to change how members get categorized.
 */
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

export type SegmentationThresholds = typeof SEGMENTATION_THRESHOLDS;
