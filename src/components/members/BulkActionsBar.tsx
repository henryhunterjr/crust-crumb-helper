import { useState } from 'react';
import { X, MessageSquare, BookOpen, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OutreachType } from '@/types/member';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkGenerateDMs: (outreachType: OutreachType) => void;
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
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isGenerating}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Generate DMs for {selectedCount}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => onBulkGenerateDMs('resource_recommendation')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Resource Recommendations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onBulkGenerateDMs('feedback_request')}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Feedback Requests
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
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
