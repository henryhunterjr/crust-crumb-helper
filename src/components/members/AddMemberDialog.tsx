import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (member: {
    skool_name: string;
    application_answer?: string;
    join_date?: string;
    email?: string;
  }) => Promise<void>;
  isAdding: boolean;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onAdd,
  isAdding,
}: AddMemberDialogProps) {
  const [name, setName] = useState('');
  const [applicationAnswer, setApplicationAnswer] = useState('');
  const [joinDate, setJoinDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    await onAdd({
      skool_name: name.trim(),
      application_answer: applicationAnswer.trim() || undefined,
      join_date: joinDate || undefined,
      email: email.trim() || undefined,
    });

    // Reset form
    setName('');
    setApplicationAnswer('');
    setJoinDate(format(new Date(), 'yyyy-MM-dd'));
    setEmail('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Member
          </DialogTitle>
          <DialogDescription>
            Quickly add a new member without importing a CSV.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Member's name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicationAnswer">Learning Goals</Label>
            <Textarea
              id="applicationAnswer"
              value={applicationAnswer}
              onChange={(e) => setApplicationAnswer(e.target.value)}
              placeholder="What they want to learn (from their application answer)"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This helps generate personalized DMs based on their interests.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="joinDate">Join Date</Label>
              <Input
                id="joinDate"
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
