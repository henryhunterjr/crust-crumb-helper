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
}

export const POST_TYPES = [
  { value: 'quick-discussion', label: 'Quick Discussion (yes/no, this or that)' },
  { value: 'fill-in-blank', label: 'Fill in the Blank' },
  { value: 'tip-of-day', label: 'Tip of the Day' },
  { value: 'unpopular-opinion', label: 'Unpopular Opinion' },
  { value: 'question', label: 'Question for the Community' },
  { value: 'challenge', label: 'Challenge / Call to Action' },
  { value: 'bake-along', label: 'Saturday Bake-Along Promo' },
] as const;

export const TARGET_AUDIENCES = [
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
  'quick-discussion': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'fill-in-blank': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'tip-of-day': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'unpopular-opinion': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'question': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'challenge': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'bake-along': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};
