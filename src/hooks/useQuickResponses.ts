import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuickResponse } from "@/types/quickResponse";
import { toast } from "sonner";

export function useQuickResponses(searchQuery: string, categoryFilter: string | null) {
  return useQuery({
    queryKey: ["quick-responses", searchQuery, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("quick_responses")
        .select("*")
        .order("use_count", { ascending: false });

      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      if (searchQuery) {
        // Search in title, content, and trigger_phrases
        query = query.or(
          `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,trigger_phrases.cs.{${searchQuery}}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as QuickResponse[];
    },
  });
}

export function useCreateQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (response: Omit<QuickResponse, "id" | "use_count" | "last_used_at" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("quick_responses")
        .insert(response)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
      toast.success("Response created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create response: " + error.message);
    },
  });
}

export function useUpdateQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...response }: Partial<QuickResponse> & { id: string }) => {
      const { data, error } = await supabase
        .from("quick_responses")
        .update(response)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
      toast.success("Response updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update response: " + error.message);
    },
  });
}

export function useDeleteQuickResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quick_responses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
      toast.success("Response deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete response: " + error.message);
    },
  });
}

export function useIncrementUseCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, currentCount }: { id: string; currentCount: number }) => {
      const { error } = await supabase
        .from("quick_responses")
        .update({ 
          use_count: currentCount + 1,
          last_used_at: new Date().toISOString() 
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-responses"] });
    },
  });
}
