export interface BlogPost {
  id: string;
  title: string;
  description: string | null;
  post_url: string | null;
  category: string | null;
  skill_level: string;
  keywords: string[] | null;
  author: string | null;
  published_at: string | null;
  reading_time: string | null;
  url_verified: boolean | null;
  last_checked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BlogPostInsert {
  title: string;
  description?: string | null;
  post_url?: string | null;
  category?: string | null;
  skill_level?: string;
  keywords?: string[] | null;
  author?: string | null;
  published_at?: string | null;
  reading_time?: string | null;
}

export const BLOG_CATEGORIES = [
  'Sourdough Basics',
  'Starter Care',
  'Shaping & Scoring',
  'Troubleshooting',
  'Equipment',
  'Yeasted Breads',
  'Enriched Doughs',
  'Advanced Techniques',
  'Ingredients & Science',
  'Business',
  'Culture & Philosophy',
  'Recipes',
  'Other',
] as const;

export const BLOG_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
