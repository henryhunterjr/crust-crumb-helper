import { useState, useMemo } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ResponseCard } from "@/components/responses/ResponseCard";
import { CategorySidebar } from "@/components/responses/CategorySidebar";
import { ResponseForm } from "@/components/responses/ResponseForm";
import { DeleteConfirmDialog } from "@/components/responses/DeleteConfirmDialog";
import { ResponseDetailDialog } from "@/components/responses/ResponseDetailDialog";
import {
  useQuickResponses,
  useCreateQuickResponse,
  useUpdateQuickResponse,
  useDeleteQuickResponse,
} from "@/hooks/useQuickResponses";
import { QuickResponse } from "@/types/quickResponse";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<QuickResponse | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewingResponse, setViewingResponse] = useState<QuickResponse | null>(null);

  // Fetch all responses for category counts (no filters)
  const { data: allResponses } = useQuickResponses("", null);
  
  // Fetch filtered responses
  const { data: responses, isLoading } = useQuickResponses(searchQuery, selectedCategory);
  
  const createMutation = useCreateQuickResponse();
  const updateMutation = useUpdateQuickResponse();
  const deleteMutation = useDeleteQuickResponse();

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    if (!allResponses) return {};
    return allResponses.reduce((acc, response) => {
      acc[response.category] = (acc[response.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allResponses]);

  const handleCreate = (data: Pick<QuickResponse, 'title' | 'content' | 'category' | 'trigger_phrases'>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setFormOpen(false);
      },
    });
  };

  const handleUpdate = (data: Pick<QuickResponse, 'title' | 'content' | 'category' | 'trigger_phrases'>) => {
    if (!editingResponse) return;
    updateMutation.mutate(
      { id: editingResponse.id, ...data },
      {
        onSuccess: () => {
          setEditingResponse(null);
          setFormOpen(false);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  };

  const handleCopy = async (id: string) => {
    // Update use count and last_used_at
    await supabase
      .from("quick_responses")
      .update({ 
        use_count: (responses?.find(r => r.id === id)?.use_count || 0) + 1,
        last_used_at: new Date().toISOString() 
      })
      .eq("id", id);
  };

  const handleEdit = (response: QuickResponse) => {
    setEditingResponse(response);
    setFormOpen(true);
    setViewingResponse(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <div className="container px-4 py-6 flex-1">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="sticky top-6">
              <h2 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Categories
              </h2>
              <CategorySidebar
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                responseCounts={categoryCounts}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search responses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => { setEditingResponse(null); setFormOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Response
              </Button>
            </div>

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedCategory || "All Responses"}
              </h2>
              <span className="text-sm text-muted-foreground">
                {responses?.length || 0} response{responses?.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Response Grid */}
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : responses?.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No responses found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search" : "Get started by adding your first response"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => { setEditingResponse(null); setFormOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Response
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {responses?.map((response) => (
                  <div 
                    key={response.id} 
                    onClick={() => setViewingResponse(response)}
                    className="cursor-pointer"
                  >
                    <ResponseCard
                      response={response}
                      onEdit={handleEdit}
                      onDelete={(id) => { setDeleteId(id); }}
                      onCopy={handleCopy}
                    />
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Forms and Dialogs */}
      <ResponseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingResponse(null);
        }}
        onSubmit={editingResponse ? handleUpdate : handleCreate}
        initialData={editingResponse}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <ResponseDetailDialog
        response={viewingResponse}
        open={viewingResponse !== null}
        onOpenChange={(open) => !open && setViewingResponse(null)}
        onEdit={handleEdit}
        onCopy={handleCopy}
      />

      <Footer />
    </div>
  );
}
