export interface ClassroomResource {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
  created_at: string | null;
}

export interface ClassroomResourceInsert {
  title: string;
  description?: string | null;
  category: string;
  skill_level?: string;
  keywords?: string[] | null;
  url?: string | null;
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
] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
