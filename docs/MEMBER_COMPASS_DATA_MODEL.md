# Member Compass — data model and future Morning Brief contract

Status: Compass is live. It is **not** wired into Morning Brief. This document
locks the shape so a future brief can read it without a schema change.

## Tables

### `member_sources`
Raw captured member words. One row per capture. Never overwritten by AI.

| Column | Notes |
| --- | --- |
| `member_id` | Null until a human resolves the match. |
| `source_type` | `introduction`, `thread_comment`, etc. |
| `source_url`, `source_external_id` | Provenance and dedupe key. |
| `source_author`, `source_author_username` | As seen on Skool. |
| `source_text` | The member's own words. |
| `captured_at` | When it was scraped. |
| `match_status` | `matched` / `ambiguous` / `unmatched` / `ignored`. |
| `match_confidence`, `match_note` | Why it matched. |

Rule: `ambiguous` and `unmatched` rows never merge silently. They sit in the
review queue until Henry assigns them.

### `member_compass_profiles`
One row per member. Derived, replaceable, except when `manually_edited` is true.

| Column | Notes |
| --- | --- |
| `member_id` | Unique. Upsert key. |
| `baking_stage` | `new` / `developing` / `confident` / `advanced` / `unknown`. |
| `struggles`, `learning_goals`, `bread_interests` | Text arrays, member's framing. |
| `why_they_bake` | One sentence, only if stated. |
| `personal_hooks`, `member_language` | Human details and verbatim phrases. |
| `next_best_action` | One concrete thing Henry could do next. |
| `recommended_resource_type/_title/_url` | Only real library rows. Null when nothing matches. |
| `insight_confidence` | `low` / `medium` / `high`. |
| `source_summary` | What the source text was. |
| `manually_edited` | True blocks re-analysis unless `force: true`. |
| `last_analyzed_at` | Freshness. |

## Access

Both tables: RLS on, policies scoped to `authenticated` + `has_role(uid,'admin')`.
No `anon` grants. The analyzer runs as `service_role` inside the edge function,
which does its own admin check on the caller's JWT first.

## Future Morning Brief read contract (do not build yet)

A brief can aggregate purely by reading, no writes and no new columns:

- **Top struggles** — `unnest(struggles)` grouped, ordered by count.
- **Learning goals with no answer** — profiles where `learning_goals <> '{}'`
  and `recommended_resource_title is null`. This is the content-gap signal.
- **Interest clusters** — `unnest(bread_interests)` grouped.
- **Who needs Henry** — `next_best_action is not null` joined to `members`,
  filtered by whatever outreach recency the brief cares about.
- **Stage mix** — count grouped by `baking_stage`.
- **Freshness** — `last_analyzed_at` tells the brief what is stale.

All of the above are read-only aggregates over existing columns. If the brief
later needs its own state (sent flags, snapshots), it must add its own table
rather than adding columns here.
