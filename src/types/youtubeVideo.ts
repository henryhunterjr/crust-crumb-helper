export interface YouTubeVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  series: string | null;
  skill_level: string;
  keywords: string[] | null;
  duration: string | null;
  published_at: string | null;
  url_verified: boolean | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface YouTubeVideoInsert {
  title: string;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  series?: string | null;
  skill_level?: string;
  keywords?: string[] | null;
  duration?: string | null;
  published_at?: string | null;
}

export const YOUTUBE_SERIES = [
  'Sourdough Basics',
  'Starter Care',
  'Shaping & Scoring',
  'Troubleshooting',
  'Recipes',
  'Equipment & Tools',
  'Advanced Techniques',
  'Behind the Scenes',
  'Interviews & Guests',
  'Shorts',
  'Live Bakes',
  'Other',
] as const;

export const YOUTUBE_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;