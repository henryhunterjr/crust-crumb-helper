import { useState } from 'react';
import { ClassroomResourceInsert, RESOURCE_CATEGORIES } from '@/types/classroomResource';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ImportResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (resources: ClassroomResourceInsert[]) => void;
  isLoading?: boolean;
}

export function ImportResourcesDialog({
  open,
  onOpenChange,
  onImport,
  isLoading,
}: ImportResourcesDialogProps) {
  const [csvData, setCsvData] = useState('');
  const [parsedResources, setParsedResources] = useState<ClassroomResourceInsert[]>([]);

  const parseCSV = (text: string): ClassroomResourceInsert[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const resources: ClassroomResourceInsert[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      const titleIdx = headers.findIndex(h => h === 'title');
      const descIdx = headers.findIndex(h => h === 'description');
      const catIdx = headers.findIndex(h => h === 'category');
      const levelIdx = headers.findIndex(h => h === 'skill_level' || h === 'level');
      const keywordsIdx = headers.findIndex(h => h === 'keywords');
      const urlIdx = headers.findIndex(h => h === 'url');

      const title = titleIdx >= 0 ? values[titleIdx] : '';
      const category = catIdx >= 0 ? values[catIdx] : '';

      if (!title || !category) continue;

      // Validate category
      const validCategory = RESOURCE_CATEGORIES.find(
        c => c.toLowerCase() === category.toLowerCase()
      ) || category;

      const keywords = keywordsIdx >= 0 && values[keywordsIdx]
        ? values[keywordsIdx].split(';').map(k => k.trim().toLowerCase()).filter(k => k)
        : null;

      resources.push({
        title,
        description: descIdx >= 0 ? values[descIdx] || null : null,
        category: validCategory,
        skill_level: levelIdx >= 0 ? values[levelIdx]?.toLowerCase() || 'beginner' : 'beginner',
        keywords,
        url: urlIdx >= 0 ? values[urlIdx] || null : null,
      });
    }

    return resources;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      const parsed = parseCSV(text);
      setParsedResources(parsed);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvData(text);
    const parsed = parseCSV(text);
    setParsedResources(parsed);
  };

  const handleImport = () => {
    if (parsedResources.length === 0) {
      toast.error('No valid resources found in the CSV data');
      return;
    }
    onImport(parsedResources);
    setCsvData('');
    setParsedResources([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setCsvData('');
      setParsedResources([]);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Resources</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to bulk import classroom resources.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csvFile">Upload CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
            />
          </div>

          <div className="text-center text-sm text-muted-foreground">or</div>

          <div className="space-y-2">
            <Label htmlFor="csvData">Paste CSV Data</Label>
            <Textarea
              id="csvData"
              value={csvData}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="title,description,category,skill_level,keywords,url
Getting Started with Sourdough,Learn the basics of sourdough,Sourdough Basics,beginner,starter;feeding;basics,https://..."
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Expected CSV Format:</p>
            <p className="text-xs text-muted-foreground">
              Columns: title, description, category, skill_level, keywords, url
            </p>
            <p className="text-xs text-muted-foreground">
              Keywords should be separated by semicolons (;)
            </p>
          </div>

          {parsedResources.length > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">
                Found {parsedResources.length} resource{parsedResources.length !== 1 ? 's' : ''} to import
              </p>
              <ul className="text-xs text-muted-foreground mt-1 max-h-24 overflow-y-auto">
                {parsedResources.slice(0, 5).map((r, i) => (
                  <li key={i}>• {r.title} ({r.category})</li>
                ))}
                {parsedResources.length > 5 && (
                  <li>... and {parsedResources.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedResources.length === 0 || isLoading}
          >
            {isLoading ? 'Importing...' : `Import ${parsedResources.length} Resource${parsedResources.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
