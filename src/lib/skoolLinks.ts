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
 * One-click DM: copies the message, then opens the member's Skool profile
 * with a hash signal (#krusty=autosend) that the Krusty Chrome extension
 * watches for. When the DM composer mounts on the profile, the extension
 * pastes the clipboard text and presses Enter automatically.
 *
 * Requires the Krusty extension v1.3+ installed.
 */
export async function sendSkoolDmAuto(
  message: string,
  username: string | null | undefined,
): Promise<boolean> {
  const base = username ? getSkoolProfileUrl(username) : getSkoolChatUrl();
  if (!base) return false;
  // window.open MUST be the first action to dodge pop-up blockers.
  const win = window.open(`${base}#krusty=autosend`, '_blank', 'noopener');
  try {
    await navigator.clipboard.writeText(message);
  } catch {
    return false;
  }
  return !!win;
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
