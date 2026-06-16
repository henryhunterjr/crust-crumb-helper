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

/**
 * Opens the community Members directory, pre-filtered with a search query.
 * This is the page where Henry can click the member and then "Message" — the
 * global /@username profile doesn't expose a Message button for community DMs.
 */
export function getCommunityMembersSearchUrl(query?: string | null): string {
  const base = `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}/-/members`;
  const q = (query || '').trim();
  if (!q) return base;
  return `${base}?t=${encodeURIComponent(q)}`;
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
  // Route to the community Members directory pre-filtered to this person.
  // The extension watches for the Message button on the member card / profile
  // panel inside the community and auto-clicks it.
  const query = (memberName || username || '').trim();
  if (!query) return { ok: false, win: null, reason: 'no-username' };
  const base = getCommunityMembersSearchUrl(query);
  // window.open MUST be the first action to dodge pop-up blockers.
  // NOTE: omit `noopener` so the extension can postMessage progress back to us.
  const win = window.open(`${base}#krusty=autosend`, '_blank');
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
  const query = (memberName || username || '').trim();
  const base = query
    ? getCommunityMembersSearchUrl(query)
    : getCommunityMembersSearchUrl();
  const win = window.open(base, '_blank');
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
    const url = username
      ? getSkoolProfileUrl(username)
      : getSkoolChatUrl();
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
    return true;
  } catch {
    return false;
  }
}
