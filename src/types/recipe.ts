export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  category: string;
  skill_level: string;
  keywords: string[] | null;
  url: string | null;
  created_at: string | null;
}

export interface RecipeInsert {
  title: string;
  description?: string | null;
  category: string;
  skill_level?: string;
  keywords?: string[] | null;
  url?: string | null;
}

export const RECIPE_CATEGORIES = [
  'Sourdough',
  'Yeasted',
  'Holiday',
  'Pastry',
] as const;

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
