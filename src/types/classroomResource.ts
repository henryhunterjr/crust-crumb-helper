export interface ClassroomResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
  parent_course_url: string | null;
  last_synced_at: string | null;
  last_checked_at: string | null;
  url_verified: boolean | null;
  created_at: string | null;
}

export interface ClassroomResourceInsert {
  title: string;
  description?: string | null;
  category: string;
  skill_level?: string;
  keywords?: string[] | null;
  url?: string | null;
  parent_course_url?: string | null;
}

export const RESOURCE_CATEGORIES = [
  'Sourdough Basics',
  'Starter Care',
  'Shaping & Scoring',
  'Troubleshooting',
  'Equipment',
  'Yeasted Breads',
  'Enriched Doughs',
  'Advanced Techniques',
  'Ingredients & Science',
  'Community Events',
  'Business',
  'Challenges',
  'Culture & Philosophy',
  'Guest Content',
  'Books & Audiobooks',
  'Tools & Resources',
] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
