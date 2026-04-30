import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BlogPost, BlogPostInsert } from '@/types/blogPost';

export function useBlogPosts() {
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading, error } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('category', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const addPost = useMutation({
    mutationFn: async (post: BlogPostInsert) => {
      const { data, error } = await supabase.from('blog_posts').insert(post).select().single();
      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BlogPostInsert> }) => {
      const { data, error } = await supabase.from('blog_posts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as BlogPost;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const importPosts = useMutation({
    mutationFn: async (posts: BlogPostInsert[]) => {
      const { data, error } = await supabase.from('blog_posts').insert(posts).select();
      if (error) throw error;
      return data as BlogPost[];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  return { posts, isLoading, error, addPost, updatePost, deletePost, importPosts };
}
