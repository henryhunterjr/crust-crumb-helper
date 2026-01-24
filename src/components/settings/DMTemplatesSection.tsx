import { useState } from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDMTemplates } from '@/hooks/useDMTemplates';
import { DMTemplateCard } from './DMTemplateCard';
import { DMTemplateFormDialog } from './DMTemplateFormDialog';
import { DeleteItemDialog } from './DeleteItemDialog';
import { DMTemplate } from '@/types/dmTemplate';
import { OutreachType } from '@/types/member';
import { toast } from 'sonner';

export function DMTemplatesSection() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useDMTemplates();
  
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DMTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<DMTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (template: DMTemplate) => {
    setEditingTemplate(template);
    setFormDialogOpen(true);
  };

  const handleDelete = (template: DMTemplate) => {
    setDeletingTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    content: string;
    outreach_type: OutreachType;
    description?: string;
  }) => {
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          updates: data,
        });
        toast.success('Template updated');
      } else {
        await createTemplate.mutateAsync(data);
        toast.success('Template created');
      }
      setFormDialogOpen(false);
    } catch (error) {
      console.error('Save template error:', error);
      toast.error('Failed to save template');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;
    
    try {
      await deleteTemplate.mutateAsync(deletingTemplate.id);
      toast.success('Template deleted');
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Delete template error:', error);
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">DM Templates</h2>
          <span className="text-sm text-muted-foreground">
            ({templates.length} saved)
          </span>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Save commonly used DM patterns for quick access when reaching out to members.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-4">No templates saved yet</p>
          <Button onClick={handleCreate} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Template
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <DMTemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDelete={() => handleDelete(template)}
            />
          ))}
        </div>
      )}

      <DMTemplateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        template={editingTemplate}
        onSave={handleSave}
        isSaving={createTemplate.isPending || updateTemplate.isPending}
      />

      <DeleteItemDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={deletingTemplate?.name || ''}
        itemType="template"
        onConfirm={handleConfirmDelete}
        isLoading={deleteTemplate.isPending}
      />
    </div>
  );
}
