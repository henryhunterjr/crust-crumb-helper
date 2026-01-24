import { useState } from 'react';
import { useRecipes } from '@/hooks/useRecipes';
import { Recipe, RecipeInsert, RECIPE_CATEGORIES } from '@/types/recipe';
import { RecipeCard } from '@/components/settings/RecipeCard';
import { RecipeFormDialog } from '@/components/settings/RecipeFormDialog';
import { ImportRecipesDialog } from '@/components/settings/ImportRecipesDialog';
import { DeleteItemDialog } from '@/components/settings/DeleteItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Search, ChefHat } from 'lucide-react';
import { toast } from 'sonner';

export function RecipePantrySection() {
  const { recipes, isLoading, addRecipe, updateRecipe, deleteRecipe, importRecipes } = useRecipes();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = searchQuery === '' || 
      recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const recipesByCategory = RECIPE_CATEGORIES.reduce((acc, category) => {
    acc[category] = recipes.filter(r => r.category === category).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setFormDialogOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormDialogOpen(true);
  };

  const handleDeleteRecipe = (recipe: Recipe) => {
    setDeletingRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: RecipeInsert) => {
    try {
      if (editingRecipe) {
        await updateRecipe.mutateAsync({ id: editingRecipe.id, updates: data });
        toast.success('Recipe updated successfully');
      } else {
        await addRecipe.mutateAsync(data);
        toast.success('Recipe added successfully');
      }
      setFormDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save recipe');
    }
  };

  const handleImport = async (data: RecipeInsert[]) => {
    try {
      await importRecipes.mutateAsync(data);
      toast.success(`Imported ${data.length} recipe${data.length !== 1 ? 's' : ''} successfully`);
      setImportDialogOpen(false);
    } catch (error) {
      toast.error('Failed to import recipes');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRecipe) return;
    try {
      await deleteRecipe.mutateAsync(deletingRecipe.id);
      toast.success('Recipe deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingRecipe(null);
    } catch (error) {
      toast.error('Failed to delete recipe');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Recipe Pantry</CardTitle>
                <CardDescription>
                  Recipes the AI recommends when members mention wanting to make specific breads.
                  {recipes.length > 0 && ` ${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} loaded.`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button onClick={handleAddRecipe}>
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">
                  All ({recipes.length})
                </TabsTrigger>
                {RECIPE_CATEGORIES.map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category} ({recipesByCategory[category] || 0})
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading recipes...</div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {recipes.length === 0 ? (
                      <div className="space-y-2">
                        <p>No recipes yet.</p>
                        <p className="text-sm">Add recipes so the AI can recommend specific breads to members.</p>
                      </div>
                    ) : (
                      'No recipes match your search.'
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        onEdit={handleEditRecipe}
                        onDelete={handleDeleteRecipe}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <RecipeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        recipe={editingRecipe}
        onSubmit={handleFormSubmit}
        isLoading={addRecipe.isPending || updateRecipe.isPending}
      />

      <ImportRecipesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isLoading={importRecipes.isPending}
      />

      <DeleteItemDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={deletingRecipe?.title || ''}
        itemType="Recipe"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteRecipe.isPending}
      />
    </>
  );
}
