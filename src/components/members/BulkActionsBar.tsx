import { useState } from 'react';
import { X, MessageSquare, BookOpen, MessageCircle, ChevronDown, Sparkles, FileText, Tags } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OutreachType, Member } from '@/types/member';
import { BulkTagDialog } from './BulkTagDialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkGenerateDMs: (outreachType: OutreachType) => void;
  isGenerating: boolean;
  selectedMembers?: Member[];
}

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection, 
  onBulkGenerateDMs,
  isGenerating,
  selectedMembers = []
}: BulkActionsBarProps) {
  const navigate = useNavigate();
  const [bulkTagOpen, setBulkTagOpen] = useState(false);

  if (selectedCount === 0) return null;

  const handleGenerateWelcomePost = () => {
    const names = selectedMembers.map(m => m.skool_name).join(', ');
    navigate('/generate', {
      state: {
        topic: `Welcome post for our new members: ${names}`,
        postType: 'new-member-welcome',
        targetAudience: 'new-members',
        memberNames: selectedMembers.map(m => m.skool_name),
      }
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border shadow-lg rounded-full px-4 py-2 flex items-center gap-3 z-50">
      <span className="text-sm font-medium">
        {selectedCount} member{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      {/* Generate Welcome Post button */}
      <Button 
        size="sm" 
        variant="outline"
        onClick={handleGenerateWelcomePost}
      >
        <FileText className="h-4 w-4 mr-2" />
        Welcome Post
      </Button>

      {/* Tag Selected button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => setBulkTagOpen(true)}
      >
        <Tags className="h-4 w-4 mr-2" />
        Tag Selected
      </Button>

      <BulkTagDialog
        open={bulkTagOpen}
        onOpenChange={setBulkTagOpen}
        memberIds={selectedMembers.map(m => m.id)}
      />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" disabled={isGenerating}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Generate DMs
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="bg-popover">
          <DropdownMenuItem onClick={() => onBulkGenerateDMs('welcome_message')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Welcome Messages
          </DropdownMenuItem>
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
