export interface QuickResponse {
  id: string;
  title: string;
  trigger_phrases: string[];
  content: string;
  category: string;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES = [
  "Sourdough Starter",
  "Troubleshooting",
  "Equipment",
  "Techniques",
  "Ingredients",
  "Getting Started",
  "Affiliate Recommendations",
] as const;

export type Category = typeof CATEGORIES[number];
