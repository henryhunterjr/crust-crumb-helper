import { describe, it, expect } from "vitest";
import {
  buildSyncBatches,
  deriveKeywords,
  entryToRow,
  type CacheEntry,
  type Topic,
} from "../../supabase/functions/_shared/bread-authority";

const topic: Topic = { slug: "sourdough-starter", name: "Sourdough Starter", subtitle: "", description: "" };

describe("entryToRow routes each content type to the right table + URL column", () => {
  it("video -> youtube_videos.video_url", () => {
    const e: CacheEntry = { title: "Strengthening A Starter", url: "https://youtu.be/abc", content_type: "video", duration: "2:55" };
    const m = entryToRow(e, topic)!;
    expect(m.table).toBe("youtube_videos");
    expect(m.row.video_url).toBe("https://youtu.be/abc");
    expect(m.row.duration).toBe("2:55");
    expect(m.row.source).toBe("bread-authority");
    expect(m.row.series).toBe("Sourdough Starter");
  });

  it("recipe -> recipes.url with required category", () => {
    const m = entryToRow({ title: "No-Knead Loaf", url: "https://pantry/x", content_type: "recipe" }, topic)!;
    expect(m.table).toBe("recipes");
    expect(m.row.url).toBe("https://pantry/x");
    expect(m.row.category).toBe("Sourdough Starter");
  });

  it("blog -> blog_posts.post_url", () => {
    const m = entryToRow({ title: "Why Your Starter Stalls", url: "https://blog/x", content_type: "blog" }, topic)!;
    expect(m.table).toBe("blog_posts");
    expect(m.row.post_url).toBe("https://blog/x");
  });

  it("lesson -> classroom_resources.url", () => {
    const m = entryToRow({ title: "Starter Module", url: "https://skool/x", content_type: "lesson" }, topic)!;
    expect(m.table).toBe("classroom_resources");
    expect(m.row.url).toBe("https://skool/x");
    expect(m.row.category).toBe("Sourdough Starter");
  });

  it("podcast -> classroom_resources", () => {
    const m = entryToRow({ title: "Counter Culture Ep", url: "https://skool/p", content_type: "podcast" }, topic)!;
    expect(m.table).toBe("classroom_resources");
  });

  it("skips book, tool, glossary", () => {
    for (const t of ["book", "tool", "glossary", "", "unknown"]) {
      expect(entryToRow({ title: "X", url: "https://x", content_type: t }, topic)).toBeNull();
    }
  });

  it("returns null when title or url is missing", () => {
    expect(entryToRow({ title: "", url: "https://x", content_type: "video" }, topic)).toBeNull();
    expect(entryToRow({ title: "X", url: "", content_type: "video" }, topic)).toBeNull();
  });
});

describe("deriveKeywords includes topic + title terms, drops stopwords", () => {
  it("builds useful keywords", () => {
    const kw = deriveKeywords({ title: "How To Feed Your Starter" }, topic);
    expect(kw).toContain("sourdough-starter");
    expect(kw).toContain("feed");
    expect(kw).toContain("starter");
    expect(kw).not.toContain("how");
    expect(kw).not.toContain("your");
  });
});

describe("buildSyncBatches groups by table and de-dupes by URL", () => {
  it("dedupes repeated URLs within a table", () => {
    const entries = [
      { entry: { title: "A", url: "https://youtu.be/1", content_type: "video" }, topic },
      { entry: { title: "A again", url: "https://youtu.be/1", content_type: "video" }, topic },
      { entry: { title: "B", url: "https://youtu.be/2", content_type: "video" }, topic },
      { entry: { title: "R", url: "https://pantry/r", content_type: "recipe" }, topic },
      { entry: { title: "Book", url: "https://amzn/b", content_type: "book" }, topic },
    ];
    const batches = buildSyncBatches(entries);
    expect(batches.youtube_videos).toHaveLength(2);
    expect(batches.recipes).toHaveLength(1);
    expect(batches.blog_posts).toHaveLength(0);
    expect(batches.classroom_resources).toHaveLength(0);
    expect(batches.youtube_videos.every((r) => r.source === "bread-authority")).toBe(true);
  });

  it("dedupes repeated TITLES within a table (recipes have UNIQUE(title))", () => {
    const t2: Topic = { slug: "rolls", name: "Rolls", subtitle: "", description: "" };
    const entries = [
      { entry: { title: "Henry's Foolproof Sourdough Loaf", url: "https://pantry/a", content_type: "recipe" }, topic },
      // same recipe title surfaced under another topic, different URL -> must collapse to one
      { entry: { title: "Henry's Foolproof Sourdough Loaf", url: "https://pantry/b", content_type: "recipe" }, topic: t2 },
    ];
    const batches = buildSyncBatches(entries);
    expect(batches.recipes).toHaveLength(1);
  });
});
