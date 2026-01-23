import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkGenerateDMs: () => void;
  isGenerating: boolean;
}

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection, 
  onBulkGenerateDMs,
  isGenerating 
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 z-50">
      <span className="text-sm font-medium">
        {selectedCount} member{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <Button
        size="sm"
        onClick={onBulkGenerateDMs}
        disabled={isGenerating}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Generate DMs for {selectedCount}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
