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
            Krusty Skool Helper — Browser Extension
          </DialogTitle>
          <DialogDescription>
            Adds a floating <b>Paste</b> and <b>Paste &amp; Send</b> button to every skool.com page so
            you can ship a generated DM from the Members page without copy → switch tabs → paste → click send.
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
              <li>Done. You'll see the orange Krusty button on every Skool page.</li>
            </ol>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <h4 className="font-semibold mb-1">How to use</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Generate a DM here, hit <b>Send via Skool</b>.</li>
              <li>The extension opens the Members page, searches the member, and clicks <b>Message</b>.</li>
              <li>It pastes the DM and sends it from the chat composer.</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              Use plain <b>Paste</b> if you want to review before sending. Works for welcome posts too — paste your
              tagged @-list straight into the community post composer.
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