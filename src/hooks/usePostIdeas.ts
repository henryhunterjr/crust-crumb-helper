import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PostIdea } from '@/types/postIdea';
import { toast } from 'sonner';

interface GeneratePostParams {
  topic: string;
  postType: string;
  targetAudience: string;
}

interface GeneratedPost {
  title: string;
  content: string;
}

export function usePostIdeas() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: postIdeas = [], isLoading } = useQuery({
    queryKey: ['post-ideas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_ideas')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PostIdea[];
    },
  });

  const generatePosts = async (params: GeneratePostParams): Promise<GeneratedPost[]> => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate posts');
      }

      const data = await response.json();
      return data.posts || [];
    } finally {
      setIsGenerating(false);
    }
  };

  const savePostIdea = useMutation({
    mutationFn: async (post: { 
      title: string; 
      content: string; 
      post_type?: string; 
      target_audience?: string; 
      topic?: string;
    }) => {
      const { data, error } = await supabase
        .from('post_ideas')
        .insert({
          title: post.title,
          content: post.content,
          post_type: post.post_type || null,
          target_audience: post.target_audience || null,
          topic: post.topic || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-ideas'] });
      toast.success('Post saved for later!');
    },
    onError: (error) => {
      toast.error('Failed to save post: ' + error.message);
    },
  });

  const deletePostIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('post_ideas')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-ideas'] });
      toast.success('Post idea deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const markAsUsed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('post_ideas')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-ideas'] });
    },
  });

  return {
    postIdeas,
    isLoading,
    isGenerating,
    generatePosts,
    savePostIdea,
    deletePostIdea,
    markAsUsed,
  };
}
