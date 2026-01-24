import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GeneratedPostCard } from '@/components/generate/GeneratedPostCard';
import { SchedulePostDialog } from '@/components/calendar/SchedulePostDialog';
import { usePostIdeas } from '@/hooks/usePostIdeas';
import { useScheduledPosts } from '@/hooks/useScheduledPosts';
import { POST_TYPES, TARGET_AUDIENCES } from '@/types/postIdea';
import { toast } from 'sonner';

interface GeneratedPost {
  title: string;
  content: string;
}

export default function Generate() {
  const [topic, setTopic] = useState('');
  const [postType, setPostType] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [postToSchedule, setPostToSchedule] = useState<GeneratedPost | null>(null);
  
  const { generatePosts, isGenerating, savePostIdea } = usePostIdeas();
  const { createScheduledPost } = useScheduledPosts();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    if (!postType) {
      toast.error('Please select a post type');
      return;
    }
    if (!targetAudience) {
      toast.error('Please select a target audience');
      return;
    }

    try {
      const posts = await generatePosts({
        topic,
        postType,
        targetAudience,
      });
      setGeneratedPosts(posts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate posts');
    }
  };

  const handleSave = (post: GeneratedPost) => {
    savePostIdea.mutate({
      title: post.title,
      content: post.content,
      post_type: postType,
      target_audience: targetAudience,
      topic,
    });
  };

  const handleSchedule = (post: GeneratedPost) => {
    setPostToSchedule(post);
    setScheduleDialogOpen(true);
  };

  const handleScheduleSave = (scheduledPost: {
    title: string;
    content: string;
    scheduled_date: string;
    time_slot?: string;
    post_type?: string;
  }) => {
    createScheduledPost.mutate(scheduledPost);
    setScheduleDialogOpen(false);
    setPostToSchedule(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container py-8 px-4 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
              AI Post Generator
            </h1>
            <p className="text-muted-foreground">
              Generate engaging posts for your bread baking community in Henry's voice.
            </p>
          </div>

          {/* Form */}
          <div className="bg-card rounded-lg border p-6 mb-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="topic">What topic do you want to post about?</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., dealing with sticky dough, overnight bakes, choosing the right flour..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Post Type</Label>
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select post type" />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      {TARGET_AUDIENCES.map(audience => (
                        <SelectItem key={audience.value} value={audience.value}>
                          {audience.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="w-full sm:w-auto"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate 3 Options
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {generatedPosts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Generated Posts</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {generatedPosts.map((post, index) => (
                  <GeneratedPostCard
                    key={index}
                    title={post.title}
                    content={post.content}
                    onSave={() => handleSave(post)}
                    onSchedule={() => handleSchedule(post)}
                    isSaving={savePostIdea.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Schedule Dialog */}
      <SchedulePostDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        selectedDate={new Date()}
        existingPost={postToSchedule ? {
          id: '',
          title: postToSchedule.title,
          content: postToSchedule.content,
          scheduled_date: new Date().toISOString(),
          time_slot: null,
          post_type: postType || null,
          status: 'planned',
          posted_at: null,
          created_at: new Date().toISOString(),
        } : null}
        onSave={handleScheduleSave}
        isNewFromIdea
      />

      <Footer />
    </div>
  );
}
