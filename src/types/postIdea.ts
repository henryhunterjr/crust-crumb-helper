export interface PostIdea {
  id: string;
  title: string;
  content: string;
  post_type: string | null;
  target_audience: string | null;
  topic: string | null;
  is_used: boolean | null;
  used_at: string | null;
  created_at: string;
}

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  scheduled_date: string;
  time_slot: string | null;
  post_type: string | null;
  status: string | null;
  posted_at: string | null;
  created_at: string;
  platform?: string | null;
  content_pillar?: string | null;
  framework?: string | null;
  source_material?: string | null;
  hashtags?: string | null;
  caption?: string | null;
}

export const PLATFORMS = [
  { value: 'skool', label: '🏫 Skool' },
  { value: 'instagram', label: '📸 Instagram' },
  { value: 'tiktok', label: '🎵 TikTok' },
] as const;

export const CONTENT_PILLARS = [
  { value: 'why-it-works', label: '🔬 Why It Works (Science)' },
  { value: 'no-gatekeeping', label: '🚫 No Gatekeeping (The Stand)' },
  { value: 'from-brick-to-beautiful', label: '✨ From Brick to Beautiful' },
  { value: 'bread-is-ritual', label: '🕯️ Bread Is Ritual (The Soul)' },
] as const;

export const FRAMEWORKS = [
  { value: 'quick-tip', label: 'Quick Tip' },
  { value: 'myth-buster', label: 'Myth Buster' },
  { value: 'before-after', label: 'Before/After' },
  { value: 'saturday-teaser', label: 'Saturday Teaser' },
  { value: 'breaking-bread-teaser', label: 'Breaking Bread Teaser' },
] as const;

export const POST_TYPES = [
  { value: 'new-member-welcome', label: 'New Member Welcome' },
  { value: 'quick-discussion', label: 'Quick Discussion (yes/no, this or that)' },
  { value: 'fill-in-blank', label: 'Fill in the Blank' },
  { value: 'tip-of-day', label: 'Tip of the Day' },
  { value: 'unpopular-opinion', label: 'Unpopular Opinion' },
  { value: 'question', label: 'Question for the Community' },
  { value: 'challenge', label: 'Challenge / Call to Action' },
  { value: 'bake-along', label: 'Saturday Bake-Along Promo' },
] as const;

export const TARGET_AUDIENCES = [
  { value: 'new-members', label: 'New Members (welcome, orientation)' },
  { value: 'new', label: 'New bakers (simple, encouraging)' },
  { value: 'intermediate', label: 'Intermediate (technique-focused)' },
  { value: 'advanced', label: 'Advanced (science, troubleshooting)' },
  { value: 'everyone', label: 'Everyone' },
] as const;

export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
] as const;

export const POST_TYPE_COLORS: Record<string, string> = {
  'new-member-welcome': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'quick-discussion': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'fill-in-blank': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'tip-of-day': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'unpopular-opinion': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'question': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'challenge': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bake-along': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};
