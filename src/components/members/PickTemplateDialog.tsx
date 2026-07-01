import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useDMTemplates } from '@/hooks/useDMTemplates';
import { DMTemplate } from '@/types/dmTemplate';
import { Member } from '@/types/member';
import { FileText, Pencil, Save, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface PickTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberCount: number;
  onPick: (template: DMTemplate) => void;
  /** Members that will receive the template — used to render live previews. */
  members?: Member[];
  /** If set, this template name is auto-selected when the dialog opens. */
  defaultTemplateName?: string | null;
}

export function PickTemplateDialog({
  open,
  onOpenChange,
  memberCount,
  onPick,
  members = [],
  defaultTemplateName = null,
}: PickTemplateDialogProps) {
  const { templates, isLoading, updateTemplate } = useDMTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) || null;

  // Auto-select the default template (e.g. "FOTM Welcome — Personal") on open.
  useEffect(() => {
    if (!open) return;
    if (selectedId) return;
    if (!defaultTemplateName || templates.length === 0) return;
    const match = templates.find(
      (t) => t.name.trim().toLowerCase() === defaultTemplateName.trim().toLowerCase()
    );
    if (match) setSelectedId(match.id);
  }, [open, defaultTemplateName, templates, selectedId]);

  // Reset local edit state whenever the selected template changes or dialog closes.
  useEffect(() => {
    setIsEditing(false);
    setEditContent(selected?.content ?? '');
  }, [selectedId, selected?.content]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setIsEditing(false);
    }
  }, [open]);

  const fillMergeTags = (text: string, m: Member) => {
    const firstName = (m.skool_name || '').trim().split(/\s+/)[0] || 'there';
    return text
      .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*name\s*\}\}/gi, m.skool_name || firstName);
  };

  const previewSource = isEditing ? editContent : selected?.content ?? '';
  const previewMembers = useMemo(() => members.slice(0, 3), [members]);

  const handleSave = async () => {
    if (!selected) return;
    setIsSaving(true);
    try {
      await updateTemplate.mutateAsync({
        id: selected.id,
        updates: { content: editContent },
      });
      toast.success('Template saved');
      setIsEditing(false);
    } catch (err) {
      console.error('Save template error:', err);
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Exact Template</DialogTitle>
          <DialogDescription>
            Pick a saved template. It will be sent verbatim to {memberCount} member
            {memberCount === 1 ? '' : 's'}, with <code>{'{{first_name}}'}</code> replaced per member.
            No AI paraphrasing.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No templates yet. Create one in Settings → DM Templates.
          </div>
        ) : (
          <ScrollArea className="max-h-[240px] pr-3">
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left border rounded-lg p-3 transition-colors ${
                    selectedId === t.id ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{t.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t.outreach_type}
                    </Badge>
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mb-1">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.content.slice(0, 160)}
                    {t.content.length > 160 ? '…' : ''}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selected && (
          <div className="border rounded-md bg-muted/30 flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-background/40">
              <span className="text-sm font-medium">
                {isEditing ? 'Editing template' : 'Template'}
              </span>
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditContent(selected.content);
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditContent(selected.content);
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      <Save className="h-3.5 w-3.5 mr-1" />
                      {isSaving ? 'Saving…' : 'Save changes'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <ScrollArea className="max-h-[220px]">
              {isEditing ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[220px] rounded-none border-0 bg-transparent focus-visible:ring-0 text-sm font-mono"
                />
              ) : (
                <div className="p-3 text-sm whitespace-pre-wrap">{selected.content}</div>
              )}
            </ScrollArea>

            {previewMembers.length > 0 && (
              <div className="border-t bg-background/40">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Live preview — showing {previewMembers.length} of {memberCount} recipient
                  {memberCount === 1 ? '' : 's'}
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="px-3 pb-3 space-y-3">
                    {previewMembers.map((m) => (
                      <div key={m.id} className="rounded-md border bg-background p-3">
                        <div className="text-xs font-semibold mb-1">→ {m.skool_name}</div>
                        <div className="text-xs whitespace-pre-wrap text-muted-foreground">
                          {fillMergeTags(previewSource, m)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || isEditing}
            onClick={() => {
              if (selected) onPick(selected);
            }}
          >
            Queue {memberCount} Send{memberCount === 1 ? '' : 's'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}