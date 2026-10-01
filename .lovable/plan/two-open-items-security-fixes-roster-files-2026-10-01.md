# Two Open Items: Security Fixes + Roster Files

## Item 1: Fix the 38 selected security findings (my side)

You selected 38 findings: 37 "permissive policy" findings (policies that allow anyone to read or change a table) and 1 "RLS disabled" finding (the `interest_resources` table).

Plan:
1. Load the scan results and match each selected internal_id to its table.
2. For each permissive policy: replace it with an admin-scoped policy (`has_role(auth.uid(), 'admin')` for the `authenticated` role) and revoke `anon` access where the table is admin-only. Tables with a legitimate public read need (library content like recipes, videos, resources) keep a read-only public policy but lose public write access.
3. Enable RLS on `interest_resources` with a public read-only policy and admin-only writes.
4. Apply all changes in one migration, then mark each of the 38 findings as fixed with the manage_security_finding tool.
5. Verify the app still loads its data (members, library, calendar) after the lockdown.

## Item 2: Roster agent local files (your side, unchanged)

The payload type you pasted is from the June 15 file again. The fix is still the same:

1. Download `roster-agent-latest.zip` from Files.
2. Extract it **into** your local `roster-agent/` folder and choose **"Replace the files in the destination"**.
3. Confirm `read-roster.mjs` mentions `COMMUNITY_SLUG` around line 56.
4. Set `COMMUNITY_SLUG` in `.env` (CCA) and `.env.fotm` (FOTM), run `run-both.bat`, paste the last ~30 lines of `roster-run.log` here.

## Out of scope

- No other security findings touched beyond the 38 you selected.
- Morning Brief stays external.
