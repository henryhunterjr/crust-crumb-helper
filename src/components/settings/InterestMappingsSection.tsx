import { useState } from 'react';
import { Plus, Trash2, Pencil, ExternalLink, Link2 } from 'lucide-react';
import { useInterestMappings, InterestMapping } from '@/hooks/useMemberTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DeleteItemDialog } from '@/components/settings/DeleteItemDialog';
import { toast } from 'sonner';

export function InterestMappingsSection() {
  const { mappings, isLoading, addMapping, updateMapping, deleteMapping } = useInterestMappings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InterestMapping | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<InterestMapping | null>(null);

  // Inline editing state
  const [inlineField, setInlineField] = useState<{ id: string; field: string; value: string } | null>(null);

  const handleInlineSave = async () => {
    if (!inlineField) return;
    try {
      await updateMapping.mutateAsync({
        id: inlineField.id,
        [inlineField.field]: inlineField.field === 'keywords'
          ? inlineField.value.split(',').map(k => k.trim()).filter(Boolean)
          : inlineField.value || null,
      });
      toast.success('Updated');
      setInlineField(null);
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (mapping: InterestMapping) => {
    setEditing(mapping);
    setFormOpen(true);
  };

  const handleDelete = (mapping: InterestMapping) => {
    setDeleting(mapping);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await deleteMapping.mutateAsync(deleting.id);
      toast.success('Mapping deleted');
      setDeleteOpen(false);
      setDeleting(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const renderCell = (mapping: InterestMapping, field: keyof InterestMapping, displayValue: string) => {
    const isEditing = inlineField?.id === mapping.id && inlineField?.field === field;

    if (isEditing) {
      return (
        <Input
          value={inlineField.value}
          onChange={(e) => setInlineField({ ...inlineField, value: e.target.value })}
          onBlur={handleInlineSave}
          onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(); if (e.key === 'Escape') setInlineField(null); }}
          className="h-7 text-xs"
          autoFocus
        />
      );
    }

    return (
      <span
        className="cursor-pointer hover:bg-accent/50 rounded px-1 py-0.5 -mx-1 block text-xs"
        onClick={() => setInlineField({
          id: mapping.id,
          field,
          value: field === 'keywords' ? (mapping.keywords || []).join(', ') : (mapping[field] as string) || '',
        })}
      >
        {displayValue || <span className="text-muted-foreground italic">Click to edit</span>}
      </span>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Interest Mappings</CardTitle>
                <CardDescription>
                  Link member interests to recommended courses, recipes, and quick wins. Click any cell to edit inline.
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : mappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No interest mappings yet. Add one to start matching members to resources.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Keywords</TableHead>
                    <TableHead>Recommended Course</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Quick Win</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {mapping.keywords.map((kw) => (
                            <Badge key={kw} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                        <button
                          className="text-[10px] text-primary mt-1 hover:underline"
                          onClick={() => setInlineField({
                            id: mapping.id,
                            field: 'keywords',
                            value: mapping.keywords.join(', '),
                          })}
                        >
                          Edit keywords
                        </button>
                        {inlineField?.id === mapping.id && inlineField?.field === 'keywords' && (
                          <Input
                            value={inlineField.value}
                            onChange={(e) => setInlineField({ ...inlineField, value: e.target.value })}
                            onBlur={handleInlineSave}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleInlineSave(); if (e.key === 'Escape') setInlineField(null); }}
                            className="h-7 text-xs mt-1"
                            placeholder="comma-separated keywords"
                            autoFocus
                          />
                        )}
                      </TableCell>
                      <TableCell>{renderCell(mapping, 'recommended_course', mapping.recommended_course || '')}</TableCell>
                      <TableCell>{renderCell(mapping, 'recommended_recipe', mapping.recommended_recipe || '')}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {renderCell(mapping, 'quick_win', mapping.quick_win || '')}
                          {mapping.book_link && (
                            <a href={mapping.book_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                              <ExternalLink className="h-3 w-3" />
                              Book link
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(mapping)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(mapping)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <InterestMappingFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mapping={editing}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateMapping.mutateAsync({ id: editing.id, ...data });
              toast.success('Mapping updated');
            } else {
              await addMapping.mutateAsync(data);
              toast.success('Mapping added');
            }
            setFormOpen(false);
          } catch {
            toast.error('Failed to save mapping');
          }
        }}
        isLoading={addMapping.isPending || updateMapping.isPending}
      />

      <DeleteItemDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={deleting?.keywords.join(', ') || ''}
        itemType="Interest Mapping"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMapping.isPending}
      />
    </>
  );
}

// Form dialog for adding/editing interest mappings
function InterestMappingFormDialog({
  open,
  onOpenChange,
  mapping,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapping: InterestMapping | null;
  onSubmit: (data: Omit<InterestMapping, 'id' | 'created_at' | 'updated_at'>) => void;
  isLoading: boolean;
}) {
  const [keywords, setKeywords] = useState('');
  const [course, setCourse] = useState('');
  const [recipe, setRecipe] = useState('');
  const [quickWin, setQuickWin] = useState('');
  const [bookLink, setBookLink] = useState('');

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o && mapping) {
      setKeywords(mapping.keywords.join(', '));
      setCourse(mapping.recommended_course || '');
      setRecipe(mapping.recommended_recipe || '');
      setQuickWin(mapping.quick_win || '');
      setBookLink(mapping.book_link || '');
    } else if (o) {
      setKeywords('');
      setCourse('');
      setRecipe('');
      setQuickWin('');
      setBookLink('');
    }
    onOpenChange(o);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      recommended_course: course || null,
      recommended_recipe: recipe || null,
      quick_win: quickWin || null,
      book_link: bookLink || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mapping ? 'Edit Interest Mapping' : 'Add Interest Mapping'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="keywords">Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="sourdough, starter, levain, wild yeast"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">These keywords match against member join reasons for auto-tagging</p>
          </div>
          <div>
            <Label htmlFor="course">Recommended Course</Label>
            <Input
              id="course"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              placeholder="Sourdough Starter 101"
            />
          </div>
          <div>
            <Label htmlFor="recipe">Recommended Recipe</Label>
            <Input
              id="recipe"
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              placeholder="Henry's Foolproof Sourdough"
            />
          </div>
          <div>
            <Label htmlFor="quickWin">Quick Win</Label>
            <Textarea
              id="quickWin"
              value={quickWin}
              onChange={(e) => setQuickWin(e.target.value)}
              placeholder="Take the Starter Health Quiz"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="bookLink">Book Link (optional)</Label>
            <Input
              id="bookLink"
              value={bookLink}
              onChange={(e) => setBookLink(e.target.value)}
              placeholder="https://a.co/d/..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {mapping ? 'Update' : 'Add'} Mapping
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
