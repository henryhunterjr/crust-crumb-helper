// Crust & Crumb Helper — Market-Curious Nurture Drip Copy
//
// THIS IS THE SOURCE OF TRUTH for the 6 nurture emails.
// Edit here, then redeploy `nurture-drip-send` (Lovable does this automatically
// on every push). The /targets admin view imports from this same file.
//
// Placeholders replaced at send time:
//   {{first_name}}   -> first token of member.skool_name (fallback "there")
//   {{unsubscribe}}  -> token-signed one-click opt-out URL
//
// HTML rules:
//   - dark text on light background (NOT the FOTM dark theme)
//   - inline styles only, no <style> tags
//   - keep an unsubscribe link using {{unsubscribe}}
//   - sign every email: "Henry" + "Perfection is not required. Progress is."

export interface NurtureEmail {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  /** Days from previous step (or from start for step 1). Used by UI only. */
  dayOffset: number;
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
  // Henry pastes the 6 entries here. Until then the drip function refuses to
  // send and logs status='copy_missing' so nothing leaks half-written.
];

export const MAX_NURTURE_STEP = 6;

export function getNurtureEmail(step: number): NurtureEmail | null {
  return NURTURE_EMAILS.find((e) => e.step === step) ?? null;
}

export function renderNurtureEmail(
  email: NurtureEmail,
  vars: { first_name: string; unsubscribe: string },
): { subject: string; html: string } {
  const replace = (s: string) =>
    s
      .split("{{first_name}}").join(vars.first_name || "there")
      .split("{{unsubscribe}}").join(vars.unsubscribe);
  return { subject: replace(email.subject), html: replace(email.html) };
}