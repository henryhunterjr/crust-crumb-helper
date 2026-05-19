import { useMemo, useState } from 'react';
import { Copy, Check, Users } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Member } from '@/types/member';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
}

type TagMode = 'username' | 'first_name';
type Separator = 'space' | 'comma' | 'newline';

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function tagFor(member: Member, mode: TagMode): string {
  if (mode === 'username' && member.skool_username) {
    return `@${member.skool_username}`;
  }
  return `@${firstName(member.skool_name)}`;
}

export function NewMemberWelcomeExportDialog({ open, onOpenChange, members }: Props) {
  const [days, setDays] = useState(10);
  const [tagMode, setTagMode] = useState<TagMode>('first_name');
  const [separator, setSeparator] = useState<Separator>('space');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const newMembers = useMemo(() => {
    const today = new Date();
    return members
      .filter(m => {
        if (!m.join_date) return false;
        return differenceInDays(today, parseISO(m.join_date)) <= days;
      })
      .sort((a, b) => (b.join_date || '').localeCompare(a.join_date || ''));
  }, [members, days]);

  const included = useMemo(
    () => newMembers.filter(m => !excluded.has(m.id)),
    [newMembers, excluded]
  );

  const joinChar = separator === 'space' ? ' ' : separator === 'comma' ? ', ' : '\n';
  const exportText = included.map(m => tagFor(m, tagMode)).join(joinChar);

  const toggle = (id: string, checked: boolean) => {
    setExcluded(prev => {
      const next = new Set(prev);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      toast.success(`Copied ${included.length} tags to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const missingUsernameCount = tagMode === 'username'
    ? included.filter(m => !m.skool_username).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            New Member Welcome Post Export
          </DialogTitle>
          <DialogDescription>
            Pull recent members and copy them as @-tags for a community welcome post.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div>
            <Label className="text-xs">Last N days</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div>
            <Label className="text-xs">Tag with</Label>
            <Select value={tagMode} onValueChange={(v) => setTagMode(v as TagMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_name">First name (@Josh)</SelectItem>
                <SelectItem value="username">Skool username (@josh-malcom-8453)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Separator</Label>
            <Select value={separator} onValueChange={(v) => setSeparator(v as Separator)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="space">Spaces</SelectItem>
                <SelectItem value="comma">Commas</SelectItem>
                <SelectItem value="newline">New lines</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <Badge variant="secondary">
            {included.length} of {newMembers.length} included
          </Badge>
          {missingUsernameCount > 0 && (
            <span className="text-xs text-amber-600">
              {missingUsernameCount} missing username — will fall back to first name
            </span>
          )}
        </div>

        {newMembers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No members have joined in the last {days} days.
          </div>
        ) : (
          <div className="border rounded-md max-h-[200px] overflow-y-auto divide-y">
            {newMembers.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-accent/40 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={!excluded.has(m.id)}
                  onCheckedChange={(c) => toggle(m.id, c as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.skool_name}</div>
                  {m.join_date && (
                    <div className="text-xs text-muted-foreground">
                      Joined {format(parseISO(m.join_date), 'MMM d')}
                    </div>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">{tagFor(m, tagMode)}</code>
              </label>
            ))}
          </div>
        )}

        <div>
          <Label className="text-xs">Preview</Label>
          <Textarea
            value={exportText}
            readOnly
            rows={4}
            className="font-mono text-sm"
            placeholder="Adjust filters above to generate tags..."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleCopy} disabled={included.length === 0}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy {included.length} Tags
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
