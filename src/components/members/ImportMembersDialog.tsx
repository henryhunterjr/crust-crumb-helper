import { useState, useRef, useMemo } from 'react';
import { Upload, FileText, Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MemberImportRow } from '@/types/member';

interface ImportMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: MemberImportRow[]) => void;
  isImporting: boolean;
}

export function ImportMembersDialog({ 
  open, 
  onOpenChange, 
  onImport,
  isImporting 
}: ImportMembersDialogProps) {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): MemberImportRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    // Parse header row handling quoted fields
    const parseRow = (line: string): string[] => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    };

    const headers = parseRow(lines[0]).map(h => h.toLowerCase());
    
    // Map common header variations - including Skool's export format
    const headerMap: Record<string, string> = {
      // Name fields
      'name': 'name',
      'skool_name': 'name',
      'skool name': 'name',
      'member': 'name',
      'firstname': 'firstName',
      'first name': 'firstName',
      'first_name': 'firstName',
      'lastname': 'lastName',
      'last name': 'lastName',
      'last_name': 'lastName',
      // Username
      'skool_username': 'skoolUsername',
      'skool username': 'skoolUsername',
      'username': 'skoolUsername',
      // Email
      'email': 'email',
      // Join date
      'join date': 'joinDate',
      'join_date': 'joinDate',
      'joined': 'joinDate',
      'joineddate': 'joinDate',
      'joined date': 'joinDate',
      // Application answer - Skool uses Answer1 for the first question response
      'application answer': 'applicationAnswer',
      'application_answer': 'applicationAnswer',
      'answer': 'applicationAnswer',
      'answer1': 'applicationAnswer',
      'goal': 'applicationAnswer',
      'goals': 'applicationAnswer',
      'learning goals': 'applicationAnswer',
      'learning_goals': 'applicationAnswer',
      // Activity stats
      'posts': 'posts',
      'post_count': 'posts',
      'post count': 'posts',
      'comments': 'comments',
      'comment_count': 'comments',
      'comment count': 'comments',
      'last active': 'lastActive',
      'last_active': 'lastActive',
      'lastactive': 'lastActive',
    };

    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const mappedKey = headerMap[header];
      if (mappedKey) {
        columnIndices[mappedKey] = index;
      }
    });

    // Check for either combined name or separate first/last name
    const hasName = columnIndices.name !== undefined;
    const hasFirstLastName = columnIndices.firstName !== undefined && columnIndices.lastName !== undefined;
    
    if (!hasName && !hasFirstLastName) {
      throw new Error('CSV must have a "Name" column or both "FirstName" and "LastName" columns');
    }

    const rows: MemberImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseRow(line);

      // Build name from either single column or first+last
      let name = '';
      if (hasName) {
        name = values[columnIndices.name] || '';
      } else if (hasFirstLastName) {
        const firstName = values[columnIndices.firstName] || '';
        const lastName = values[columnIndices.lastName] || '';
        name = `${firstName} ${lastName}`.trim();
      }

      if (!name) continue;

      const row: MemberImportRow = { name };

      if (columnIndices.skoolUsername !== undefined) {
        row.skoolUsername = values[columnIndices.skoolUsername] || undefined;
      }
      if (columnIndices.email !== undefined) {
        row.email = values[columnIndices.email] || undefined;
      }
      if (columnIndices.joinDate !== undefined) {
        const dateValue = values[columnIndices.joinDate];
        if (dateValue) {
          // Handle Skool's datetime format (2026-01-24 20:39:21)
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            row.joinDate = parsed.toISOString().split('T')[0];
          }
        }
      }
      if (columnIndices.applicationAnswer !== undefined) {
        row.applicationAnswer = values[columnIndices.applicationAnswer] || undefined;
      }
      if (columnIndices.posts !== undefined) {
        row.posts = parseInt(values[columnIndices.posts]) || 0;
      }
      if (columnIndices.comments !== undefined) {
        row.comments = parseInt(values[columnIndices.comments]) || 0;
      }
      if (columnIndices.lastActive !== undefined) {
        const dateValue = values[columnIndices.lastActive];
        if (dateValue) {
          const parsed = new Date(dateValue);
          if (!isNaN(parsed.getTime())) {
            row.lastActive = parsed.toISOString().split('T')[0];
          }
        }
      }

      rows.push(row);
    }

    return rows;
  };

  // Check if CSV has application answer column
  const csvAnalysis = useMemo(() => {
    if (!csvText.trim()) return null;
    
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 1) return null;
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const applicationAnswerHeaders = [
        'application answer', 'application_answer', 'answer', 'answer1', 'answer2',
        'goal', 'goals', 'learning goals', 'learning_goals'
      ];
      
      const hasApplicationAnswerColumn = headers.some(h => applicationAnswerHeaders.includes(h));
      
      // Try to parse and count rows with answers
      let totalRows = 0;
      let rowsWithAnswer = 0;
      
      if (hasApplicationAnswerColumn) {
        try {
          const parsed = parseCSV(csvText);
          totalRows = parsed.length;
          rowsWithAnswer = parsed.filter(r => r.applicationAnswer && r.applicationAnswer.trim().length > 0).length;
        } catch {
          // Parsing failed, just return column info
        }
      }
      
      return { hasApplicationAnswerColumn, totalRows, rowsWithAnswer };
    } catch {
      return null;
    }
  }, [csvText]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvText(text);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      setError(null);
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        throw new Error('No valid rows found in CSV');
      }
      onImport(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Members from CSV</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="paste" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">
              <FileText className="h-4 w-4 mr-2" />
              Paste CSV
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="csv-text">CSV Data</Label>
                <Textarea
                  id="csv-text"
                  placeholder="Name,Email,Join Date,Application Answer,Posts,Comments,Last Active
John Doe,john@email.com,2024-01-15,Want to learn sourdough,0,0,
Jane Smith,jane@email.com,2024-01-10,Interested in bread baking,5,12,2024-01-20"
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    setError(null);
                  }}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload a CSV file
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              {csvText && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md max-h-[150px] overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {csvText.slice(0, 500)}{csvText.length > 500 ? '...' : ''}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Expected columns:</strong> Name (required), Email, Join Date, <strong>Application Answer</strong> (important for personalization), Posts, Comments, Last Active
          </p>
        </div>

        {/* Warning if no application answer column found */}
        {csvAnalysis && !csvAnalysis.hasApplicationAnswerColumn && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>No application answers found in CSV.</strong> Personalized outreach will be limited. 
              Add a column named "Application Answer", "Goal", or "Learning Goals" for best results.
            </AlertDescription>
          </Alert>
        )}

        {/* Info about rows with/without answers */}
        {csvAnalysis && csvAnalysis.hasApplicationAnswerColumn && csvAnalysis.totalRows > 0 && (
          <div className="mt-2 p-3 bg-accent/30 rounded-md text-sm">
            {csvAnalysis.rowsWithAnswer === csvAnalysis.totalRows ? (
              <span className="text-foreground">
                ✓ All {csvAnalysis.totalRows} members have learning goals
              </span>
            ) : (
              <span className="text-muted-foreground">
                {csvAnalysis.rowsWithAnswer} of {csvAnalysis.totalRows} members have learning goals. 
                {csvAnalysis.totalRows - csvAnalysis.rowsWithAnswer > 0 && 
                  ` ${csvAnalysis.totalRows - csvAnalysis.rowsWithAnswer} will receive generic outreach.`}
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mt-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!csvText.trim() || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Members'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
