/**
 * Skool deep-link helpers.
 * Since the Skool API doesn't support sending DMs,
 * we use clipboard + deep-link as the delivery mechanism.
 */

const SKOOL_COMMUNITY_SLUG = 'crust-crumb-academy-7621';
const FOTM_COMMUNITY_SLUG = 'from-oven-to-market';

/**
 * Pick the Skool community slug for a member based on their `communities` array.
 * Prefers From Oven to Market when tagged, otherwise falls back to Crust & Crumb Academy.
 */
export function pickSkoolSlugForCommunities(
  communities: string[] | null | undefined,
): string {
  if (Array.isArray(communities) && communities.includes('from-oven-to-market')) {
    return FOTM_COMMUNITY_SLUG;
  }
  return SKOOL_COMMUNITY_SLUG;
}

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
  communitySlug: string = SKOOL_COMMUNITY_SLUG,
): string {
  const q = encodeURIComponent(memberName || '');
  return `https://www.skool.com/${communitySlug}/-/members#krusty=auto${mode === 'send' ? 'send' : 'paste'}&member=${q}`;
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
  communities?: string[] | null,
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(message);
    // Prefer the members directory route in the correct community — Skool's
    // /@handle pages 404 for many usernames, and the extension can search +
    // click Message reliably from the directory of the right community.
    const slug = pickSkoolSlugForCommunities(communities);
    const url = memberName
      ? getSkoolMembersSearchUrl(memberName, 'send', slug)
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
