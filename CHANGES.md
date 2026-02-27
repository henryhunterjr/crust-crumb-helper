# Changes — Pre-Launch Hardening

## 1. Configurable Segmentation Thresholds
- Created `src/config/segmentation.ts` with all engagement thresholds (Never Engaged, At Risk, Inactive, Active, Needs Welcome, Joined This Week).
- Updated `useMembers.ts` and `Members.tsx` to use centralized thresholds instead of scattered magic numbers.
- Filter counts now derive from the same logic as the segment assignments — no more off-by-one mismatches.

## 2. DM Personalization & Voice Cleanup
- Rewrote the `generate-dm` edge function prompt to enforce plain text (no markdown, no asterisks, no em dashes).
- Added post-processing regex to strip any residual bold, italic, header, or bullet markdown from AI output.
- Banned stiff phrasing ("ensure," "delve," "journey," etc.) in the system prompt.
- Kept DMs to ~100-120 words in Henry's warm, conversational tone.

## 3. Skool API Research & Deep-Link Fallback
- Confirmed `docs.skoolapi.com` does NOT support sending DMs via API.
- Added `src/lib/skoolLinks.ts` with helpers to deep-link to a member's Skool profile and copy the DM to clipboard.
- Added "Copy & Open Skool" button in the GeneratedDMDialog and OutreachQueue so Henry can paste messages directly.

## 4. Google Sign-In Authentication
- Added Google OAuth via Lovable Cloud managed auth.
- Created `src/pages/Login.tsx` with branded sign-in page.
- Created `src/components/ProtectedRoute.tsx` to guard all dashboard routes.
- Added sign-out button to the Header with user avatar display.
- All routes except `/login` now require authentication.

## 5. Smart Search Improvements
- Added query term highlighting in search results (bold matching words).
- Added deduplication so the same result doesn't appear twice.
- Added markdown stripping to AI-composed responses (same regex as DM cleanup).

## 6. Accessibility Improvements
- Added `aria-label` attributes to all icon-only buttons (refresh, settings, copy, edit, skip, approve, etc.).
- Added proper `aria-label` to checkbox elements for screen readers.
- Ensured logical tab order through modals and lists.

## 7. Documentation
- Created this `CHANGES.md` file.
- Created `QA-CHECKLIST.md` with step-by-step verification instructions.

---

## Known Limitations / Outstanding Items
- **Role-based access**: Currently any Google account can sign in. To restrict to specific admins, add a `user_roles` table and RLS policies.
- **Queue persistence**: Queue state resets on navigation. A future improvement could persist to the database.
- **Email campaigns**: Tab is present but not connected to an external mail provider. Consider marking "Coming Soon" or integrating Resend/SendGrid.
- **Drag-and-drop calendar**: Not yet implemented. Posts can be reordered by editing scheduled dates.
- **Analytics aggregation**: Shows raw outreach data. Weekly roll-up charts are a future enhancement.
- **Unit tests**: Segmentation logic and DM generation are testable but test files haven't been expanded yet.
