/**
 * Skool deep-link helpers.
 * Since the Skool API doesn't support sending DMs,
 * we use clipboard + deep-link as the delivery mechanism.
 */

const SKOOL_COMMUNITY_SLUG = 'crust-crumb-academy-7621';

/** Opens the member's Skool profile in a new tab. */
export function getSkoolProfileUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  const handle = username.replace(/^@/, '');
  return `https://www.skool.com/@${handle}`;
}

/**
 * Members directory URL with a search query in the hash so the Krusty extension
 * can auto-search, click the member, click Message, then paste & send.
 */
export function getSkoolMembersSearchUrl(
  memberName: string,
  mode: 'send' | 'paste' = 'send',
): string {
  const q = encodeURIComponent(memberName || '');
  return `https://www.skool.com/${SKOOL_COMMUNITY_SLUG}/-/members#krusty=auto${mode === 'send' ? 'send' : 'paste'}&member=${q}`;
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
  username: string | null | undefined,
  memberName?: string | null,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    // Prefer the members directory route — Skool's /@handle pages 404 for many
    // usernames, and the extension can search + click Message reliably.
    const url = memberName
      ? getSkoolMembersSearchUrl(memberName, 'send')
      : username
        ? getSkoolProfileUrl(username)
        : getSkoolChatUrl();
    if (url) {
      // No `noopener` — the extension posts progress back via window.opener.
      window.open(url, '_blank');
    }
    return true;
  } catch {
    return false;
  }
}
