import { IncomingSource, PreviewRow } from '@/types/compass';

export interface MatchCandidate {
  id: string;
  skool_name: string;
  skool_username: string | null;
}

/** Collapse whitespace (Skool uses non-breaking spaces), strip punctuation, lowercase. */
export function normalizeName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.,'"`’]/g, '');
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

/**
 * Match strictly: exact username first, then normalized exact name.
 * Anything else is ambiguous or unmatched and goes to manual review.
 * We never fuzzy-merge.
 */
export function matchSources(
  incoming: IncomingSource[],
  members: MatchCandidate[]
): PreviewRow[] {
  const byUsername = new Map<string, MatchCandidate[]>();
  const byName = new Map<string, MatchCandidate[]>();

  for (const m of members) {
    if (m.skool_username) {
      const key = normalizeUsername(m.skool_username);
      byUsername.set(key, [...(byUsername.get(key) || []), m]);
    }
    const nkey = normalizeName(m.skool_name);
    byName.set(nkey, [...(byName.get(nkey) || []), m]);
  }

  return incoming.map((row) => {
    const base = {
      ...row,
      matchStatus: 'unmatched' as PreviewRow['matchStatus'],
      matchedMemberId: null as string | null,
      matchedMemberName: null as string | null,
      matchConfidence: 0,
      matchNote: 'No member matched. Sent to review.',
      candidates: [] as { id: string; name: string }[],
    };

    if (row.username) {
      const hits = byUsername.get(normalizeUsername(row.username)) || [];
      if (hits.length === 1) {
        return {
          ...base,
          matchStatus: 'matched',
          matchedMemberId: hits[0].id,
          matchedMemberName: hits[0].skool_name,
          matchConfidence: 1,
          matchNote: 'Exact Skool username match.',
        };
      }
      if (hits.length > 1) {
        return {
          ...base,
          matchStatus: 'ambiguous',
          matchConfidence: 0.5,
          matchNote: `${hits.length} members share that username.`,
          candidates: hits.map((h) => ({ id: h.id, name: h.skool_name })),
        };
      }
    }

    if (row.author) {
      const hits = byName.get(normalizeName(row.author)) || [];
      if (hits.length === 1) {
        return {
          ...base,
          matchStatus: 'matched',
          matchedMemberId: hits[0].id,
          matchedMemberName: hits[0].skool_name,
          matchConfidence: 0.85,
          matchNote: 'Exact name match (normalized).',
        };
      }
      if (hits.length > 1) {
        return {
          ...base,
          matchStatus: 'ambiguous',
          matchConfidence: 0.5,
          matchNote: `${hits.length} members share that name. Pick one in review.`,
          candidates: hits.map((h) => ({ id: h.id, name: h.skool_name })),
        };
      }
    }

    return base;
  });
}

/** Accepts JSON, CSV, or pasted "Name (@username)" blocks. */
export function parseIncoming(raw: string): { rows: IncomingSource[]; format: string } {
  const text = raw.trim();
  if (!text) return { rows: [], format: 'empty' };

  // 1. JSON
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed)
        ? parsed
        : parsed.comments || parsed.items || parsed.records || parsed.captures || [];
      const sharedUrl = Array.isArray(parsed) ? undefined : parsed.url || parsed.postUrl;
      const rows = (list as any[])
        .map((r) => ({
          author: r.author ?? r.name ?? r.memberName ?? undefined,
          username: r.username ?? r.skoolUsername ?? r.handle ?? undefined,
          text: String(r.text ?? r.body ?? r.content ?? r.comment ?? '').trim(),
          url: r.url ?? r.permalink ?? sharedUrl ?? undefined,
          externalId: r.externalId ?? r.id ?? undefined,
          capturedAt: r.capturedAt ?? r.captured_at ?? undefined,
          sourceType: r.sourceType ?? r.type ?? 'introduction',
        }))
        .filter((r) => r.text.length > 0);
      return { rows, format: 'json' };
    } catch {
      return { rows: [], format: 'invalid-json' };
    }
  }

  // 2. CSV with a header row
  const lines = text.split(/\r?\n/);
  const header = lines[0]?.toLowerCase() ?? '';
  if (header.includes(',') && /(name|author|username)/.test(header) && /(text|answer|intro|comment|body)/.test(header)) {
    const cols = splitCsvLine(lines[0]).map((c) => c.trim().toLowerCase());
    const idx = (...names: string[]) => cols.findIndex((c) => names.includes(c));
    const iAuthor = idx('author', 'name', 'skool_name', 'member');
    const iUser = idx('username', 'skool_username', 'handle');
    const iText = idx('text', 'body', 'comment', 'intro', 'introduction', 'answer');
    const iUrl = idx('url', 'link', 'source_url');
    const iId = idx('id', 'external_id', 'externalid');

    const rows: IncomingSource[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const c = splitCsvLine(lines[i]);
      const body = (iText >= 0 ? c[iText] : '')?.trim() ?? '';
      if (!body) continue;
      rows.push({
        author: iAuthor >= 0 ? c[iAuthor]?.trim() : undefined,
        username: iUser >= 0 ? c[iUser]?.trim() : undefined,
        text: body,
        url: iUrl >= 0 ? c[iUrl]?.trim() : undefined,
        externalId: iId >= 0 ? c[iId]?.trim() : undefined,
        sourceType: 'introduction',
      });
    }
    return { rows, format: 'csv' };
  }

  // 3. Pasted blocks: first line is "Name" or "Name (@username)", rest is text.
  const blocks = text.split(/\n\s*\n/);
  const rows: IncomingSource[] = [];
  for (const block of blocks) {
    const blockLines = block.split(/\r?\n/).filter((l) => l.trim());
    if (blockLines.length < 2) continue;
    const head = blockLines[0].trim();
    const m = head.match(/^(.+?)\s*[（(]?@([A-Za-z0-9._-]+)[)）]?$/);
    rows.push({
      author: (m ? m[1] : head).replace(/[:\-–]\s*$/, '').trim(),
      username: m ? m[2] : undefined,
      text: blockLines.slice(1).join('\n').trim(),
      sourceType: 'introduction',
    });
  }
  return { rows: rows.filter((r) => r.text), format: 'text' };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
