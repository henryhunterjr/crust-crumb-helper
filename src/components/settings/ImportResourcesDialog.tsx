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
import { Download } from 'lucide-react';
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

  // Auto-suggest keywords from title + description when none provided
  const suggestKeywords = (title: string, description: string, category: string): string[] => {
    const text = `${title} ${description} ${category}`.toLowerCase();
    const stop = new Set([
      'the','a','an','and','or','to','of','for','in','on','with','your','you','how','what','why',
      'is','it','this','that','from','by','at','as','be','are','will','can','about','my','our',
      'i','we','they','them','their','these','those','if','but','so','do','does','done','make',
      'made','use','using','used','get','got','new','one','two','three','best','first','step',
    ]);
    const tokens = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 3 && !stop.has(t));
    const counts: Record<string, number> = {};
    tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([k]) => k);
  };

  const downloadTemplate = () => {
    const header = 'title,description,category,skill_level,keywords,url';
    const examples = [
      'Getting Started with Sourdough,Beginner walkthrough of starter to first loaf,Sourdough Basics,beginner,starter;feeding;first loaf;basics,https://example.com/intro',
      'Discard Pancakes,Quick weekend pancakes using sourdough discard,Discard,beginner,discard;pancakes;quick;breakfast,https://example.com/pancakes',
      'Bread Baker Bench YouTube Channel,Full video library on artisan bread,YouTube,beginner,video;youtube;tutorials;artisan,https://youtube.com/@yourchannel',
      'Why Your Crumb is Tight (Blog),Diagnosing dense crumb issues,Blog Posts,intermediate,crumb;dense;troubleshooting;hydration,https://yoursite.com/blog/tight-crumb',
    ];
    const csv = [header, ...examples].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'classroom-resources-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

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

      const description = descIdx >= 0 ? values[descIdx] || '' : '';
      const rawKeywords = keywordsIdx >= 0 && values[keywordsIdx]
        ? values[keywordsIdx].split(';').map(k => k.trim().toLowerCase()).filter(k => k)
        : [];
      const keywords = rawKeywords.length > 0
        ? rawKeywords
        : suggestKeywords(title, description, validCategory);

      resources.push({
        title,
        description: description || null,
        category: validCategory,
        skill_level: levelIdx >= 0 ? values[levelIdx]?.toLowerCase() || 'beginner' : 'beginner',
        keywords: keywords.length > 0 ? keywords : null,
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
      if (parsed.length > 0) {
        toast.success(`Parsed ${parsed.length} resource${parsed.length !== 1 ? 's' : ''} — review and click Import`);
      }
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
            Download the template, fill it in, then upload it back. Keywords get auto-suggested from the title if you leave that column empty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="text-sm">
              <p className="font-medium">Step 1: Download the template</p>
              <p className="text-xs text-muted-foreground">CSV with the right columns and a few examples</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="csvFile">Step 2: Upload your filled-out CSV</Label>
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
              Keywords are separated by semicolons (;). Leave blank to auto-suggest from title.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Categories include: Sourdough Basics, Starter Care, Troubleshooting, YouTube, Blog Posts, Books & Audiobooks, and more.
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
