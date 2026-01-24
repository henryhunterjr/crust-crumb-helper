import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClassroomResource, ClassroomResourceInsert } from '@/types/classroomResource';

export function useClassroomResources() {
  const queryClient = useQueryClient();

  const { data: resources = [], isLoading, error } = useQuery({
    queryKey: ['classroom-resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classroom_resources')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as ClassroomResource[];
    },
  });

  const addResource = useMutation({
    mutationFn: async (resource: ClassroomResourceInsert) => {
      const { data, error } = await supabase
        .from('classroom_resources')
        .insert(resource)
        .select()
        .single();

      if (error) throw error;
      return data as ClassroomResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-resources'] });
    },
  });

  const updateResource = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClassroomResourceInsert> }) => {
      const { data, error } = await supabase
        .from('classroom_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ClassroomResource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-resources'] });
    },
  });

  const deleteResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classroom_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-resources'] });
    },
  });

  const importResources = useMutation({
    mutationFn: async (resources: ClassroomResourceInsert[]) => {
      const { data, error } = await supabase
        .from('classroom_resources')
        .insert(resources)
        .select();

      if (error) throw error;
      return data as ClassroomResource[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classroom-resources'] });
    },
  });

  return {
    resources,
    isLoading,
    error,
    addResource,
    updateResource,
    deleteResource,
    importResources,
  };
}
