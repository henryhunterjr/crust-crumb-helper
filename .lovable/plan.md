
# Calibrate Member Engagement Data

## The Problem

All 386 members have zero activity data (`last_active`, `post_count`, `comment_count` are all empty/zero). The Skool CSV export you used didn't include those columns, so the app treats everyone as disengaged even when you talk to them daily. The segmentation numbers are meaningless right now.

## What We'll Fix

### 1. Bulk "Mark as Active" Tool
Add a way to select multiple members and mark them as "Active" in one click. This updates their `engagement_status` to `active` and sets `last_active` to today. You can use this for everyone you know you've been chatting with.

### 2. Quick Status Override on Member Cards
Add a small dropdown on each member card so you can change their engagement status directly (Active, At Risk, Inactive, Never Engaged) without opening a dialog. When you mark someone Active, it auto-sets their `last_active` to today.

### 3. Smarter "Needs Welcome" Logic
Right now "Needs Welcome" = joined 3+ days ago AND no outreach sent. But if you've already talked to someone (even outside the app), they shouldn't show up. We'll add: if `engagement_status` is `active` OR `outreach_sent` is true, exclude from "Needs Welcome."

### 4. Re-import Support for Activity Columns
The CSV importer already supports Posts, Comments, and Last Active columns -- but Skool's export may not include them. We'll add a note in the import dialog explaining which columns are needed for accurate segmentation, and what happens when they're missing (everyone defaults to "unknown" instead of "never_engaged").

### 5. Fix the "Unknown" vs "Never Engaged" Default
Currently, members imported without activity data get marked as "never_engaged" after 7 days. This is wrong when we have no data. Instead, members with zero activity data AND no `last_active` date should stay as "unknown" (meaning "we don't know yet") rather than being assumed disengaged. Only mark "never_engaged" when we actually have activity data showing zero posts/comments.

### 6. Dashboard Accuracy
Update the Dashboard's "Urgent Actions" panel to exclude members with "unknown" status from the "needs welcome" and "never engaged" alerts, so those numbers actually mean something.

---

## Technical Details

**Files to modify:**

- `src/hooks/useMembers.ts` -- Fix segmentation logic: don't assign `never_engaged` when `last_active` is null and we have no real activity data. Keep as `unknown`.
- `src/config/segmentation.ts` -- No changes needed (thresholds are fine, the logic applying them is the issue).
- `src/pages/Members.tsx` -- Add bulk "Mark as Active" to the BulkActionsBar; update filter counts to handle `unknown` properly.
- `src/components/members/MemberCard.tsx` -- Add inline engagement status dropdown.
- `src/components/members/BulkActionsBar.tsx` -- Add "Mark as Active" bulk action.
- `src/components/members/MemberFilterTabs.tsx` -- Update "Needs Welcome" filter to exclude active/unknown members.
- `src/components/members/ImportMembersDialog.tsx` -- Add info note about activity columns and what happens when missing.
- `src/components/dashboard/UrgentActionsPanel.tsx` -- Only count members with confirmed engagement data in alerts.
- `src/types/member.ts` -- Potentially add a new filter option for "unknown" status.

**Database update:**
- Bulk update all 386 existing members from `never_engaged` back to `unknown` (since we genuinely don't know their status).
- When Henry marks members as active, set `last_active = today` and `engagement_status = 'active'`.

**Key logic change in `useMembers.ts` import:**
```text
Before: if joined 7+ days ago AND zero posts AND zero comments -> "never_engaged"
After:  if joined 7+ days ago AND zero posts AND zero comments AND last_active IS NOT NULL -> "never_engaged"
        if no activity data at all (last_active is null, posts=0, comments=0) -> "unknown"
```

This way, "never_engaged" only applies when we have evidence of inactivity, not when we simply lack data.
