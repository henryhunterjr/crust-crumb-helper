import { useState, useMemo } from 'react';
import { X, Plus, Search, BookOpen, ChefHat, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateQuickResponse } from '@/hooks/useQuickResponses';

interface ResponseTopicTagsProps {
  responseId: string;
  topicTags: string[];
  relatedCourseIds: string[];
  relatedRecipeIds: string[];
  searchHitCount: number;
  compact?: boolean;
}

export function ResponseTopicTags({
  responseId,
  topicTags = [],
  relatedCourseIds = [],
  relatedRecipeIds = [],
  searchHitCount = 0,
  compact = false,
}: ResponseTopicTagsProps) {
  const updateMutation = useUpdateQuickResponse();
  const [tagSearch, setTagSearch] = useState('');
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [coursePopoverOpen, setCoursePopoverOpen] = useState(false);
  const [recipePopoverOpen, setRecipePopoverOpen] = useState(false);

  // Fetch courses and recipes for linking
  const { data: courses = [] } = useQuery({
    queryKey: ['classroom-resources-list'],
    queryFn: async () => {
      const { data } = await supabase.from('classroom_resources').select('id, title, url, url_verified').order('title');
      return data || [];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes-list'],
    queryFn: async () => {
      const { data } = await supabase.from('recipes').select('id, title, url, skool_url, url_verified').order('title');
      return data || [];
    },
  });

  // Linked items
  const linkedCourses = useMemo(() =>
    courses.filter(c => relatedCourseIds.includes(c.id)), [courses, relatedCourseIds]);
  const linkedRecipes = useMemo(() =>
    recipes.filter(r => relatedRecipeIds.includes(r.id)), [recipes, relatedRecipeIds]);
  const availableCourses = useMemo(() =>
    courses.filter(c => !relatedCourseIds.includes(c.id)), [courses, relatedCourseIds]);
  const availableRecipes = useMemo(() =>
    recipes.filter(r => !relatedRecipeIds.includes(r.id)), [recipes, relatedRecipeIds]);

  const handleAddTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanTag || topicTags.includes(cleanTag)) return;
    updateMutation.mutate({ id: responseId, topic_tags: [...topicTags, cleanTag] });
    setTagSearch('');
  };

  const handleRemoveTag = (tag: string) => {
    updateMutation.mutate({ id: responseId, topic_tags: topicTags.filter(t => t !== tag) });
  };

  const handleLinkCourse = (courseId: string) => {
    updateMutation.mutate({ id: responseId, related_course_ids: [...relatedCourseIds, courseId] });
    setCoursePopoverOpen(false);
  };

  const handleUnlinkCourse = (courseId: string) => {
    updateMutation.mutate({ id: responseId, related_course_ids: relatedCourseIds.filter(id => id !== courseId) });
  };

  const handleLinkRecipe = (recipeId: string) => {
    updateMutation.mutate({ id: responseId, related_recipe_ids: [...relatedRecipeIds, recipeId] });
    setRecipePopoverOpen(false);
  };

  const handleUnlinkRecipe = (recipeId: string) => {
    updateMutation.mutate({ id: responseId, related_recipe_ids: relatedRecipeIds.filter(id => id !== recipeId) });
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Topic tags row */}
        {topicTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {topicTags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {/* Search hit count */}
        {searchHitCount > 0 && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Search className="h-2.5 w-2.5" />
            {searchHitCount}x in search
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Topic Tags */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Topic Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {topicTags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs gap-1 pr-1">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:bg-foreground/10 rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2">
                <Plus className="h-3 w-3" /> add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-popover" align="start">
              <Input
                placeholder="Type tag name"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleAddTag(tagSearch); setTagPopoverOpen(false); } }}
                className="h-7 text-xs mb-1"
                autoFocus
              />
              <Button size="sm" className="w-full h-7 text-xs" onClick={() => { handleAddTag(tagSearch); setTagPopoverOpen(false); }}>
                Add
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Related Courses */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Related Courses</p>
        <div className="space-y-1">
          {linkedCourses.map(course => (
            <div key={course.id} className="flex items-center gap-2 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{course.title}</span>
              {course.url_verified ? (
                <span className="text-emerald-600 text-[10px]">URL ✓</span>
              ) : (
                <span className="text-amber-500 text-[10px]">⚠️</span>
              )}
              <button onClick={() => handleUnlinkCourse(course.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {linkedCourses.length === 0 && (
            <p className="text-xs text-muted-foreground italic">(none linked)</p>
          )}
          <Popover open={coursePopoverOpen} onOpenChange={setCoursePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2">
                <LinkIcon className="h-3 w-3" /> Link Course
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-popover" align="start">
              <ScrollArea className="max-h-48">
                {availableCourses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleLinkCourse(c.id)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  >
                    <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.title}</span>
                    {c.url_verified && <span className="text-emerald-600 ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
                {availableCourses.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">All courses linked</p>}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Related Recipes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Related Recipes</p>
        <div className="space-y-1">
          {linkedRecipes.map(recipe => (
            <div key={recipe.id} className="flex items-center gap-2 text-xs">
              <ChefHat className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{recipe.title}</span>
              {recipe.url_verified ? (
                <span className="text-emerald-600 text-[10px]">URL ✓</span>
              ) : (
                <span className="text-amber-500 text-[10px]">⚠️</span>
              )}
              <button onClick={() => handleUnlinkRecipe(recipe.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {linkedRecipes.length === 0 && (
            <p className="text-xs text-muted-foreground italic">(none linked)</p>
          )}
          <Popover open={recipePopoverOpen} onOpenChange={setRecipePopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2">
                <LinkIcon className="h-3 w-3" /> Link Recipe
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-popover" align="start">
              <ScrollArea className="max-h-48">
                {availableRecipes.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleLinkRecipe(r.id)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  >
                    <ChefHat className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.title}</span>
                    {r.url_verified && <span className="text-emerald-600 ml-auto text-[10px]">✓</span>}
                  </button>
                ))}
                {availableRecipes.length === 0 && <p className="text-xs text-muted-foreground px-2 py-1">All recipes linked</p>}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Hit Count */}
      {searchHitCount > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Search className="h-3.5 w-3.5" />
          Surfaced in smart search {searchHitCount} time{searchHitCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
