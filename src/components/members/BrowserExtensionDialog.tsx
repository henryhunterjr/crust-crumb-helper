import { Download, Puzzle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BrowserExtensionDialog({ open, onOpenChange }: Props) {
  const handleDownload = () => {
    fetch('/krusty-skool-helper.zip')
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'krusty-skool-helper.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        toast.success('Extension downloaded');
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5" />
            Krusty Skool Helper — v2.1.0
          </DialogTitle>
          <DialogDescription>
            Adds a <b>Paste for review</b> button and a <b>Capture thread</b> button to every
            Skool and Skooly page. It never sends, posts, replies, or likes anything on your behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">How to install (one-time, ~30 sec)</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click <b>Download Extension</b> below and unzip the file.</li>
              <li>Open <code className="bg-muted px-1 rounded">chrome://extensions</code> in Chrome (or Edge / Brave / Arc).</li>
              <li>Toggle <b>Developer mode</b> in the top-right corner.</li>
              <li>Click <b>Load unpacked</b> and pick the unzipped <code className="bg-muted px-1 rounded">extension</code> folder.</li>
              <li>Done. You'll see the orange Krusty buttons on every Skool page.</li>
            </ol>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <h4 className="font-semibold mb-1">📋 Sending a DM (review-only)</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Generate a DM here, hit <b>Copy &amp; Open Skool</b>.</li>
              <li>Open the exact conversation with that member.</li>
              <li>Click <b>📋 Paste for review</b>, read it over, then press send yourself.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              On Skooly the extension can find the matching conversation for you, but it stops at
              paste. If it can't match the member exactly, it pastes nothing and tells you why.
            </p>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <h4 className="font-semibold mb-1">🧭 Capturing threads for Member Compass</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Open an introductions or discussion thread in Skool.</li>
              <li>Scroll down so the comments you want are loaded on the page.</li>
              <li>Click <b>🧭 Capture thread</b> — it copies the thread as JSON.</li>
              <li>Paste it into <b>Import Introductions</b> on Member Compass and review the matches.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Capture is read-only. Anything it can't confidently match to a member lands in the
              review queue instead of being merged.
            </p>
          </div>
        </div>


        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Extension
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}