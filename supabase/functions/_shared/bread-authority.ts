// Bread Authority sync logic — pure, runtime-neutral, dependency-free.
//
// Turns entries from the public Bread Authority cache
// (https://bakinggreatbread.com/library-cache/) into rows for the Helper's
// existing content tables, so generate-dm recommends from Henry's full,
// real catalog (with real URLs) instead of the small hand-maintained copy.
// The edge function (Deno) and the vitest test both import this file.
//
// Source of truth: BREAD_AUTHORITY_SYSTEM_README.md. Entry shape:
//   { title, url, content_type, date_published, source_platform,
//     performance_tier, duration }
// content_type is one of: video, podcast, recipe, blog, book, lesson, tool, glossary.

export interface CacheEntry {
  title?: string;
  url?: string;
  content_type?: string;
  source_platform?: string;
  performance_tier?: string;
  duration?: string;
  date_published?: string;
}

export interface Topic {
  slug?: string;
  name?: string;
  subtitle?: string;
  description?: string;
}

export type ContentTable =
  | "youtube_videos"
  | "recipes"
  | "blog_posts"
  | "classroom_resources";

export interface MappedRow {
  table: ContentTable;
  row: Record<string, unknown>;
}

// Which cache content_type lands in which table. Books, tools, and glossary
// terms are intentionally skipped: they are not the "here is a resource to
// learn or make X" links the welcome recommends (books/tools are promo,
// glossary has no slot in generate-dm). Podcasts route to classroom_resources
// since they are Skool-hosted lessons in spirit and have no dedicated table.
const TYPE_TO_TABLE: Record<string, ContentTable> = {
  video: "youtube_videos",
  recipe: "recipes",
  blog: "blog_posts",
  lesson: "classroom_resources",
  podcast: "classroom_resources",
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "in", "on", "with",
  "how", "your", "you", "my", "is", "it", "this", "that", "best", "easy",
]);

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Keywords used by generate-dm's matcher: topic slug + topic name + title words. */
export function deriveKeywords(entry: CacheEntry, topic: Topic): string[] {
  const set = new Set<string>();
  if (topic.slug) set.add(topic.slug.toLowerCase());
  for (const w of tokenize(topic.name || "")) set.add(w);
  for (const w of tokenize(entry.title || "")) set.add(w);
  return [...set].slice(0, 12);
}

/**
 * Map one cache entry (within a topic) to a content-table row, or null if its
 * type is not synced or it has no usable URL/title. Every synced row carries
 * source='bread-authority' so a re-sync can replace exactly these rows and
 * never touch Henry's hand-added rows (source='manual').
 */
export function entryToRow(entry: CacheEntry, topic: Topic): MappedRow | null {
  const type = (entry.content_type || "").toLowerCase();
  const table = TYPE_TO_TABLE[type];
  if (!table) return null;
  const title = (entry.title || "").trim();
  const url = (entry.url || "").trim();
  if (!title || !url) return null;

  const category = (topic.name || topic.slug || "Bread Authority").trim();
  const keywords = deriveKeywords(entry, topic);
  const skill = "beginner"; // tables default to beginner; performance_tier is editorial, not skill

  switch (table) {
    case "youtube_videos":
      return {
        table,
        row: {
          title,
          video_url: url,
          series: category,
          duration: entry.duration || null,
          keywords,
          skill_level: skill,
          source: "bread-authority",
        },
      };
    case "recipes":
      return {
        table,
        row: { title, url, category, keywords, skill_level: skill, source: "bread-authority" },
      };
    case "blog_posts":
      return {
        table,
        row: { title, post_url: url, category, keywords, skill_level: skill, source: "bread-authority" },
      };
    case "classroom_resources":
      return {
        table,
        row: { title, url, category, keywords, skill_level: skill, source: "bread-authority" },
      };
  }
}

/** Group mapped rows by table, de-duplicated by URL within each table. */
export function buildSyncBatches(
  entries: Array<{ entry: CacheEntry; topic: Topic }>,
): Record<ContentTable, Record<string, unknown>[]> {
  const out: Record<ContentTable, Record<string, unknown>[]> = {
    youtube_videos: [],
    recipes: [],
    blog_posts: [],
    classroom_resources: [],
  };
  const seen: Record<ContentTable, Set<string>> = {
    youtube_videos: new Set(),
    recipes: new Set(),
    blog_posts: new Set(),
    classroom_resources: new Set(),
  };
  for (const { entry, topic } of entries) {
    const mapped = entryToRow(entry, topic);
    if (!mapped) continue;
    const urlKey = String(mapped.row.video_url || mapped.row.post_url || mapped.row.url)
      .toLowerCase().trim();
    if (seen[mapped.table].has(urlKey)) continue;
    seen[mapped.table].add(urlKey);
    out[mapped.table].push(mapped.row);
  }
  return out;
}
