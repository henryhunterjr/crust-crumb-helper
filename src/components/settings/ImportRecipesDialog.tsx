import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RecipeInsert, RECIPE_CATEGORIES } from '@/types/recipe';
import { toast } from 'sonner';

interface ImportRecipesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (recipes: RecipeInsert[]) => void;
  isLoading?: boolean;
}

export function ImportRecipesDialog({
  open,
  onOpenChange,
  onImport,
  isLoading,
}: ImportRecipesDialogProps) {
  const [csvData, setCsvData] = useState('');
  const [parsedRecipes, setParsedRecipes] = useState<RecipeInsert[]>([]);

  const parseCSV = (text: string): RecipeInsert[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const recipes: RecipeInsert[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const recipe: RecipeInsert = {
        title: '',
        category: RECIPE_CATEGORIES[0],
      };

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        switch (header) {
          case 'title':
            recipe.title = value;
            break;
          case 'description':
            recipe.description = value || null;
            break;
          case 'category':
            recipe.category = RECIPE_CATEGORIES.includes(value as any) ? value : RECIPE_CATEGORIES[0];
            break;
          case 'skill_level':
            recipe.skill_level = ['beginner', 'intermediate', 'advanced'].includes(value) ? value : 'beginner';
            break;
          case 'keywords':
            recipe.keywords = value ? value.split(';').map(k => k.trim().toLowerCase()) : null;
            break;
          case 'url':
            recipe.url = value || null;
            break;
        }
      });

      if (recipe.title) {
        recipes.push(recipe);
      }
    }

    return recipes;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleTextChange(text);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvData(text);
    try {
      const parsed = parseCSV(text);
      setParsedRecipes(parsed);
    } catch (error) {
      toast.error('Failed to parse CSV');
      setParsedRecipes([]);
    }
  };

  const handleImport = () => {
    if (parsedRecipes.length === 0) {
      toast.error('No valid recipes to import');
      return;
    }
    onImport(parsedRecipes);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setCsvData('');
      setParsedRecipes([]);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Recipes</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>

          <div className="space-y-2">
            <Label>Or Paste CSV Data</Label>
            <Textarea
              value={csvData}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="title,description,category,skill_level,keywords,url"
              rows={6}
            />
          </div>

          {parsedRecipes.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Preview ({parsedRecipes.length} recipes):</p>
              <ul className="list-disc list-inside mt-1 max-h-32 overflow-y-auto">
                {parsedRecipes.slice(0, 5).map((r, idx) => (
                  <li key={idx}>{r.title} ({r.category})</li>
                ))}
                {parsedRecipes.length > 5 && (
                  <li>...and {parsedRecipes.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedRecipes.length === 0 || isLoading}
          >
            {isLoading ? 'Importing...' : `Import ${parsedRecipes.length} Recipe${parsedRecipes.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
