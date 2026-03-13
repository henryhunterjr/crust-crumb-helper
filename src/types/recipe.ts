export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
  tags: string[] | null;
  share_url: string | null;
  skool_url: string | null;
  uses_discard: boolean | null;
  related_course: string | null;
  last_checked_at: string | null;
  url_verified: boolean | null;
  created_at: string | null;
}

export interface RecipeInsert {
  title: string;
  description?: string | null;
  category: string;
  skill_level?: string;
  keywords?: string[] | null;
  url?: string | null;
  tags?: string[] | null;
  share_url?: string | null;
  skool_url?: string | null;
  uses_discard?: boolean | null;
  related_course?: string | null;
}

export const RECIPE_CATEGORIES = [
  'Sourdough',
  'Yeasted',
  'Enriched',
  'Flatbread',
  'Discard',
  'Holiday',
  'Pastry',
  'Quick Breads',
  'Gluten-Free',
] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
