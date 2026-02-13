import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useImportSubscribers } from '@/hooks/useEmailCampaigns';

interface ImportSubscribersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportSubscribersDialog({ open, onOpenChange }: ImportSubscribersDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [parsed, setParsed] = useState<any[]>([]);
  const importMutation = useImportSubscribers();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.trim().replace(/^"|"$/g, '')) || [];
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        rows.push(row);
      }

      setParsed(rows);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = () => {
    const subscribers = parsed.map(row => {
      const email = row['email'] || row['e-mail'] || '';
      const firstName = row['first name'] || row['first_name'] || row['firstname'] || null;
      const lastName = row['last name'] || row['last_name'] || row['lastname'] || null;
      const listStatus = row['list status'] || row['list_status'] || 'subscribed';
      const globalStatus = row['global status'] || row['global_status'] || 'subscribed';
      const subscriptionTime = row['subscription time'] || row['subscription_time'] || null;
      const confirmationTime = row['confirmation time'] || row['confirmation_time'] || null;
      const listName = row['list'] || row['list_name'] || null;

      return {
        email,
        first_name: firstName,
        last_name: lastName,
        status: globalStatus === 'subscribed' && listStatus === 'subscribed' ? 'subscribed' : 'unconfirmed',
        source: 'mailpoet',
        subscription_time: subscriptionTime ? new Date(subscriptionTime).toISOString() : null,
        confirmation_time: confirmationTime ? new Date(confirmationTime).toISOString() : null,
        list_name: listName,
      };
    }).filter(s => s.email);

    importMutation.mutate(subscribers, {
      onSuccess: () => {
        onOpenChange(false);
        setFile(null);
        setParsed([]);
        setPreview([]);
      },
    });
  };

  const confirmed = parsed.filter(r => {
    const ls = r['list status'] || r['list_status'] || '';
    const gs = r['global status'] || r['global_status'] || '';
    return ls === 'subscribed' && gs === 'subscribed';
  }).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Email Subscribers</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload MailPoet CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:font-medium hover:file:bg-primary/90 file:cursor-pointer"
            />
          </div>

          {parsed.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Import Summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total rows:</span>
                <span className="font-medium">{parsed.length}</span>
                <span className="text-muted-foreground">Confirmed/active:</span>
                <span className="font-medium">{confirmed}</span>
                <span className="text-muted-foreground">Unconfirmed:</span>
                <span className="font-medium">{parsed.length - confirmed}</span>
              </div>

              {preview.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">Preview (first 5):</p>
                  <div className="space-y-1 text-xs">
                    {preview.map((row, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-medium">{row['first name'] || row['first_name'] || '?'}</span>
                        <span className="text-muted-foreground">{row['email'] || row['e-mail']}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={parsed.length === 0 || importMutation.isPending}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? 'Importing...' : `Import ${parsed.length} Subscribers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
