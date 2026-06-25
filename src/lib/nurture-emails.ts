// Crust & Crumb Helper — Market-Curious Nurture Drip Copy
//
// Edit the entries below to change what gets sent. Keep `step` 1..6 and the
// array sorted by step. The drip function reads this array directly.
//
// Placeholders the renderer replaces at send time:
//   {{first_name}}   -> derived from member.skool_name (first token)
//   {{unsubscribe}}  -> full unsubscribe URL (token-signed)
//
// HTML rules:
//   - dark text on light background
//   - inline styles only
//   - keep an explicit unsubscribe link using {{unsubscribe}}
//   - sign every email: Henry / Perfection is not required. Progress is.

export interface NurtureEmail {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  subject: string;
  /** Inline-styled HTML. Use {{first_name}} and {{unsubscribe}}. */
  html: string;
}

export const NURTURE_EMAILS: NurtureEmail[] = [
  // step 1 — Day 0  — Welcome + quiz
  // step 2 — Day 5  — Pricing math
  // step 3 — Day 10 — Cottage food law
  // step 4 — Day 15 — Markets & booths
  // step 5 — Day 20 — Course + community
  // step 6 — Day 25 — Final check-in
  //
  // Henry pastes the 6 entries here. Until then the drip function will
  // refuse to send and log "copy_missing" so nothing leaks half-written.
];

export function getNurtureEmail(step: number): NurtureEmail | null {
  return NURTURE_EMAILS.find((e) => e.step === step) ?? null;
}

export const MAX_NURTURE_STEP = 6;