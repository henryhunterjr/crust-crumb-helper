/**
 * Skool deep-link helpers.
 * Since the Skool API doesn't support sending DMs,
 * we use clipboard + deep-link as the delivery mechanism.
 */

const SKOOL_COMMUNITY_SLUG = 'crust-crumb-academy-7621';

/** Opens the member's Skool profile in a new tab. */
export function getSkoolProfileUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  return `https://www.skool.com/u/${username}`;
}

/** Opens the Skool chat page in a new tab. */
export function getSkoolChatUrl(): string {
  return `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}/chat`;
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
