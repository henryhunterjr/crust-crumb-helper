import { useState } from 'react';
import { Check, X, Link2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SkoolUsernameInputProps {
  username: string | null;
  onSave: (username: string) => Promise<void>;
  compact?: boolean;
}

export function SkoolUsernameInput({ username, onSave, compact = false }: SkoolUsernameInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(username || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    
    // Clean the username - remove @ prefix and any URL parts
    let cleanUsername = value.trim();
    if (cleanUsername.startsWith('@')) {
      cleanUsername = cleanUsername.slice(1);
    }
    // Extract username from full URL if pasted
    const urlMatch = cleanUsername.match(/skool\.com\/@([^?\/]+)/);
    if (urlMatch) {
      cleanUsername = urlMatch[1];
    }
    
    setIsSaving(true);
    try {
      await onSave(cleanUsername);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(username || '');
    setIsEditing(false);
  };

  if (username && !isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Link2 className="h-3 w-3" />
        @{username}
      </button>
    );
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Link2 className="h-3 w-3" />
        {compact ? 'Add @username' : 'Add Skool username'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. josh-malcom-8453"
        className="h-7 text-xs w-40"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleSave}
        disabled={!value.trim() || isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleCancel}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
