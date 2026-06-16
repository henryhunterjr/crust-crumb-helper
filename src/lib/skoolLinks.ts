/**
 * Skool deep-link helpers.
 * Since the Skool API doesn't support sending DMs,
 * we use clipboard + deep-link as the delivery mechanism.
 */

const SKOOL_COMMUNITY_SLUG = 'crust-crumb-academy-7621';

/** Opens the member's Skool profile in a new tab. */
export function getSkoolProfileUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  // Skool profile URLs are skool.com/@username (the /u/ path returns 404).
  const handle = username.replace(/^@/, '');
  return `https://www.skool.com/@${handle}`;
}

/** Opens the Skool chat page in a new tab. */
export function getSkoolChatUrl(): string {
  return `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}/chat`;
}

/** Opens the Skool community feed (where you post a welcome post). */
export function getSkoolCommunityUrl(): string {
  return `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}`;
}

/** Opens the community Members directory. */
export function getCommunityMembersUrl(): string {
  return `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}/-/members`;
}

function buildKrustyHash(mode: 'autosend' | 'autopaste', memberQuery?: string | null): string {
  const params = new URLSearchParams({ krusty: mode });
  const q = (memberQuery || '').trim();
  if (q) params.set('member', q);
  return `#${params.toString()}`;
}

/**
 * One-click DM: copies the message, then opens the member's Skool profile
 * with a hash signal (#krusty=autosend) that the Krusty Chrome extension
 * watches for. When the DM composer mounts on the profile, the extension
 * pastes the clipboard text and presses Enter automatically.
 *
 * Requires the Krusty extension v1.3+ installed.
 */
export interface SendSkoolDmResult {
  ok: boolean;
  /** Window ref for the opened Skool tab (null if pop-up blocked). */
  win: Window | null;
  /** Reason for failure when ok is false. */
  reason?: 'no-username' | 'popup-blocked' | 'clipboard-failed';
}

export async function sendSkoolDmAuto(
  message: string,
  username: string | null | undefined,
  memberName?: string | null,
): Promise<SendSkoolDmResult> {
  // Route to the plain community Members directory. Skool 404s when the search
  // query is placed in the URL, so the extension receives the member name in
  // the hash and performs the search after the page loads.
  const query = (memberName || username || '').trim();
  if (!query) return { ok: false, win: null, reason: 'no-username' };
  const base = getCommunityMembersUrl();
  // window.open MUST be the first action to dodge pop-up blockers.
  // NOTE: omit `noopener` so the extension can postMessage progress back to us.
  const win = window.open(`${base}${buildKrustyHash('autosend', query)}`, '_blank');
  if (!win) return { ok: false, win: null, reason: 'popup-blocked' };
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    return { ok: false, win, reason: 'clipboard-failed' };
  }
  return { ok: true, win };
}

/**
 * Fallback when the extension isn't installed: copy the DM, open the
 * member's profile (no autosend hash), and leave the user to click
 * Message + paste manually. Returns the opened window or null.
 */
export async function copyAndOpenProfileFallback(
  message: string,
  username: string | null | undefined,
  memberName?: string | null,
): Promise<{ ok: boolean; win: Window | null }> {
  const win = window.open(getCommunityMembersUrl(), '_blank');
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    return { ok: false, win };
  }
  return { ok: true, win };
}

/**
 * Copy message to clipboard and open the member's Skool profile
 * so Henry can start a chat from there.
 */
export async function copyAndOpenSkool(
  message: string,
  username: string | null | undefined
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    window.open(getCommunityMembersUrl(), '_blank', 'noopener');
    return true;
  } catch {
    return false;
  }
}
