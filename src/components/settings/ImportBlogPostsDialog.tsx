import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BlogPostInsert, BLOG_CATEGORIES, BLOG_SKILL_LEVELS } from '@/types/blogPost';
import { toast } from 'sonner';
import { Download } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (posts: BlogPostInsert[]) => void;
  isLoading?: boolean;
}

const STOP = new Set(['the','a','an','and','or','to','of','for','in','on','with','your','you','how','what','why','is','it','this','that','from','by','at','as','be','are','will','can','about','my','our','i','we','they','them','their','these','those','if','but','so','do','does','done','make','made','use','using','used','get','got','new','one','two','three','best','first','step','post','blog','read']);

function suggestKeywords(title: string, description: string, category: string): string[] {
  const text = `${title} ${description} ${category}`.toLowerCase();
  const tokens = text.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(t => t.length > 3 && !STOP.has(t));
  const counts: Record<string, number> = {};
  tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

export function ImportBlogPostsDialog({ open, onOpenChange, onImport, isLoading }: Props) {
  const [csvData, setCsvData] = useState('');
  const [parsed, setParsed] = useState<BlogPostInsert[]>([]);

  const downloadTemplate = () => {
    const header = 'title,description,post_url,category,skill_level,author,reading_time,published_at,keywords';
    const examples = [
      '"How to Read Your Sourdough Starter","Visual cues that tell you when your starter is ready","https://bakinggreatbread.blog/starter-cues","Starter Care","beginner","Henry Hunter","6 min","2024-04-12","starter;feeding;peak;readiness;beginner"',
      '"Hydration Math Made Simple","A clear way to calculate baker percentages without a headache","https://bakinggreatbread.blog/hydration-math","Ingredients & Science","intermediate","Henry Hunter","8 min","2024-06-02","hydration;baker percentage;math;flour;water"',
      '"Why Your Crumb Looks Tight","Diagnosing dense crumb in sourdough loaves","https://bakinggreatbread.blog/tight-crumb","Troubleshooting","intermediate","Henry Hunter","7 min","2024-07-19","crumb;dense;troubleshooting;fermentation"',
      '"Selling Bread at the Farmers Market","Pricing, packaging, and pitching for first-time sellers","https://bakinggreatbread.blog/farmers-market","Business","intermediate","Henry Hunter","10 min","2024-08-04","sell;market;business;pricing;cottage"',
    ];
    const csv = [header, ...examples].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'blog-posts-template.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const parseCSV = (text: string): BlogPostInsert[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]).map(h => h.toLowerCase());
    const out: BlogPostInsert[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      const title = row.title;
      if (!title) continue;
      const category = BLOG_CATEGORIES.find(c => c.toLowerCase() === (row.category || '').toLowerCase()) || row.category || null;
      const skillRaw = (row.skill_level || row.level || '').toLowerCase();
      const skill_level = (BLOG_SKILL_LEVELS as readonly string[]).includes(skillRaw) ? skillRaw : 'beginner';
      const rawKeywords = row.keywords ? row.keywords.split(';').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
      const keywords = rawKeywords.length ? rawKeywords : suggestKeywords(title, row.description || '', category || '');
      out.push({
        title,
        description: row.description || null,
        post_url: row.post_url || row.url || null,
        category,
        skill_level,
        author: row.author || null,
        reading_time: row.reading_time || null,
        published_at: row.published_at || null,
        keywords: keywords.length ? keywords : null,
      });
    }
    return out;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvData(text);
      const p = parseCSV(text);
      setParsed(p);
      if (p.length) toast.success(`Parsed ${p.length} post${p.length !== 1 ? 's' : ''} - review and click Import`);
    };
    reader.readAsText(file);
  };

  const handleText = (text: string) => {
    setCsvData(text);
    setParsed(parseCSV(text));
  };

  const handleImport = () => {
    if (parsed.length === 0) { toast.error('No valid posts found'); return; }
    onImport(parsed);
    setCsvData(''); setParsed([]);
  };

  const handleClose = (o: boolean) => {
    if (!o) { setCsvData(''); setParsed([]); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Blog Posts</DialogTitle>
          <DialogDescription>
            Download the template, fill in your posts, then upload it back. Wrap fields with commas in double quotes. Keywords auto-suggest from the title if you leave that column empty.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="text-sm">
              <p className="font-medium">Step 1: Download the template</p>
              <p className="text-xs text-muted-foreground">CSV with the right columns and example rows</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blogFile">Step 2: Upload your filled-out CSV</Label>
            <Input id="blogFile" type="file" accept=".csv,.txt" onChange={handleFile} />
          </div>

          <div className="text-center text-sm text-muted-foreground">or</div>

          <div className="space-y-2">
            <Label htmlFor="blogCsv">Paste CSV Data</Label>
            <Textarea id="blogCsv" value={csvData} onChange={(e) => handleText(e.target.value)} rows={6} className="font-mono text-xs"
              placeholder="title,description,post_url,category,skill_level,author,reading_time,published_at,keywords" />
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Expected CSV Format</p>
            <p className="text-xs text-muted-foreground">Columns: title, description, post_url, category, skill_level, author, reading_time, published_at, keywords</p>
            <p className="text-xs text-muted-foreground">Keywords are separated by semicolons (;). Leave blank to auto-suggest from title.</p>
            <p className="text-xs text-muted-foreground mt-1">Category options: {BLOG_CATEGORIES.join(', ')}</p>
          </div>

          {parsed.length > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium text-primary">Found {parsed.length} post{parsed.length !== 1 ? 's' : ''} to import</p>
              <ul className="text-xs text-muted-foreground mt-1 max-h-24 overflow-y-auto">
                {parsed.slice(0, 5).map((p, i) => (<li key={i}>• {p.title} ({p.category || 'Other'})</li>))}
                {parsed.length > 5 && <li>... and {parsed.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={parsed.length === 0 || isLoading}>
            {isLoading ? 'Importing...' : `Import ${parsed.length} Post${parsed.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
