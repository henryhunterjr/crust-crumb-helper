import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { YouTubeVideo, YouTubeVideoInsert } from '@/types/youtubeVideo';

export function useYouTubeVideos() {
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading, error } = useQuery({
    queryKey: ['youtube-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .order('series', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });
      if (error) throw error;
      return data as YouTubeVideo[];
    },
  });

  const addVideo = useMutation({
    mutationFn: async (video: YouTubeVideoInsert) => {
      const { data, error } = await supabase.from('youtube_videos').insert(video).select().single();
      if (error) throw error;
      return data as YouTubeVideo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-videos'] }),
  });

  const updateVideo = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<YouTubeVideoInsert> }) => {
      const { data, error } = await supabase.from('youtube_videos').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as YouTubeVideo;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-videos'] }),
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('youtube_videos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-videos'] }),
  });

  const importVideos = useMutation({
    mutationFn: async (videos: YouTubeVideoInsert[]) => {
      const { data, error } = await supabase.from('youtube_videos').insert(videos).select();
      if (error) throw error;
      return data as YouTubeVideo[];
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['youtube-videos'] }),
  });

  return { videos, isLoading, error, addVideo, updateVideo, deleteVideo, importVideos };
}