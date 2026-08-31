import type { IntroductionCaptureRow, IntroductionPreviewRow, MemberCompassProfile } from '@/types/memberCompass';
import type { Member } from '@/types/member';

export function normalizeSkoolUsername(value?: string | null) {
  return (value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?skool\.com\/@/i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
}

export function normalizeMemberName(value?: string | null) {
  return (value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

function parseCsv(input: string): IntroductionCaptureRow[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const indexOf = (...names: string[]) => headers.findIndex((h) => names.includes(h));
  const authorIndex = indexOf('author', 'name', 'member', 'membername');
  const usernameIndex = indexOf('username', 'handle', 'skoolusername');
  const textIndex = indexOf('text', 'comment', 'introduction', 'sourcetext');
  const urlIndex = indexOf('sourceurl', 'url', 'posturl');
  const idIndex = indexOf('externalid', 'commentid', 'id');
  const capturedIndex = indexOf('capturedat', 'captured', 'date');

  if (authorIndex < 0 || textIndex < 0) return [];

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      author: values[authorIndex] || '',
      username: usernameIndex >= 0 ? values[usernameIndex] || null : null,
      text: values[textIndex] || '',
      sourceUrl: urlIndex >= 0 ? values[urlIndex] || null : null,
      externalId: idIndex >= 0 ? values[idIndex] || null : null,
      capturedAt: capturedIndex >= 0 ? values[capturedIndex] || null : null,
    };
  }).filter((row) => row.author && row.text);
}

function parseStructuredText(input: string): IntroductionCaptureRow[] {
  const blocks = input.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
  const parsed: IntroductionCaptureRow[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const fields = new Map<string, string>();
    const freeText: string[] = [];
    for (const line of lines) {
      const match = line.match(/^(name|author|member|username|handle|text|comment|introduction|url|source\s*url|id)\s*:\s*(.+)$/i);
      if (match) fields.set(match[1].toLowerCase().replace(/\s/g, ''), match[2].trim());
      else freeText.push(line);
    }
    const author = fields.get('name') || fields.get('author') || fields.get('member') || '';
    const text = fields.get('text') || fields.get('comment') || fields.get('introduction') || freeText.join('\n');
    if (!author || !text) continue;
    parsed.push({
      author,
      username: fields.get('username') || fields.get('handle') || null,
      text,
      sourceUrl: fields.get('url') || fields.get('sourceurl') || null,
      externalId: fields.get('id') || null,
    });
  }
  return parsed;
}

export function parseIntroductionImport(input: string): IntroductionCaptureRow[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  try {
    const json = JSON.parse(trimmed);
    const rows = Array.isArray(json) ? json : Array.isArray(json?.comments) ? json.comments : Array.isArray(json?.items) ? json.items : [];
    return rows.map((row: any) => ({
      author: String(row.author || row.name || row.member || '').trim(),
      username: row.username || row.handle || row.skool_username || null,
      text: String(row.text || row.comment || row.introduction || row.source_text || '').trim(),
      sourceUrl: row.sourceUrl || row.source_url || row.url || null,
      externalId: row.externalId || row.external_id || row.id || null,
      capturedAt: row.capturedAt || row.captured_at || null,
    })).filter((row: IntroductionCaptureRow) => row.author && row.text);
  } catch {
    // Fall through to CSV / labeled text.
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0].toLowerCase();
  if (firstLine.includes(',') && /(author|name|member)/.test(firstLine) && /(text|comment|introduction)/.test(firstLine)) {
    const csvRows = parseCsv(trimmed);
    if (csvRows.length) return csvRows;
  }
  return parseStructuredText(trimmed);
}

export function previewIntroductionMatches(rows: IntroductionCaptureRow[], members: Member[]): IntroductionPreviewRow[] {
  const byUsername = new Map<string, Member[]>();
  const byName = new Map<string, Member[]>();

  for (const member of members) {
    const username = normalizeSkoolUsername(member.skool_username);
    if (username) byUsername.set(username, [...(byUsername.get(username) || []), member]);
    const name = normalizeMemberName(member.skool_name);
    if (name) byName.set(name, [...(byName.get(name) || []), member]);
  }

  return rows.map((row, index) => {
    const username = normalizeSkoolUsername(row.username);
    const usernameMatches = username ? byUsername.get(username) || [] : [];
    if (usernameMatches.length === 1) {
      const member = usernameMatches[0];
      return { ...row, key: `${row.externalId || index}`, memberId: member.id, memberName: member.skool_name, matchStatus: 'matched', matchConfidence: 1 };
    }
    if (usernameMatches.length > 1) {
      return { ...row, key: `${row.externalId || index}`, memberId: null, memberName: null, matchStatus: 'ambiguous', matchConfidence: null };
    }

    const nameMatches = byName.get(normalizeMemberName(row.author)) || [];
    if (nameMatches.length === 1) {
      const member = nameMatches[0];
      return { ...row, key: `${row.externalId || index}`, memberId: member.id, memberName: member.skool_name, matchStatus: 'matched', matchConfidence: 0.9 };
    }
    return {
      ...row,
      key: `${row.externalId || index}`,
      memberId: null,
      memberName: null,
      matchStatus: nameMatches.length > 1 ? 'ambiguous' : 'unmatched',
      matchConfidence: null,
    };
  });
}

export function profileContains(profile: MemberCompassProfile | undefined, query: string) {
  if (!profile || !query.trim()) return false;
  const q = query.trim().toLowerCase();
  const values = [
    profile.baking_stage,
    profile.why_they_bake,
    profile.next_best_action,
    profile.recommended_resource_title,
    profile.source_summary,
    ...profile.struggles,
    ...profile.learning_goals,
    ...profile.bread_interests,
    ...profile.personal_hooks,
    ...profile.member_language,
  ].filter(Boolean).map((value) => String(value).toLowerCase());
  return values.some((value) => value.includes(q));
}

export function tallyCompassValues(profiles: MemberCompassProfile[], field: 'struggles' | 'learning_goals' | 'bread_interests') {
  const map = new Map<string, { count: number; memberIds: string[] }>();
  for (const profile of profiles) {
    for (const raw of profile[field] || []) {
      const topic = raw.trim();
      if (!topic) continue;
      const key = topic.toLowerCase();
      const existing = map.get(key) || { count: 0, memberIds: [] };
      existing.count += 1;
      existing.memberIds.push(profile.member_id);
      map.set(key, existing);
    }
  }
  return [...map.entries()]
    .map(([key, value]) => ({ topic: key, ...value }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}
