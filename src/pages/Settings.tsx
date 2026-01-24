import { useState } from 'react';
import { Header } from '@/components/Header';
import { useClassroomResources } from '@/hooks/useClassroomResources';
import { ClassroomResource, ClassroomResourceInsert, RESOURCE_CATEGORIES } from '@/types/classroomResource';
import { ResourceCard } from '@/components/settings/ResourceCard';
import { ResourceFormDialog } from '@/components/settings/ResourceFormDialog';
import { ImportResourcesDialog } from '@/components/settings/ImportResourcesDialog';
import { DeleteResourceDialog } from '@/components/settings/DeleteResourceDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Search, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { resources, isLoading, addResource, updateResource, deleteResource, importResources } = useClassroomResources();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ClassroomResource | null>(null);
  const [deletingResource, setDeletingResource] = useState<ClassroomResource | null>(null);

  const filteredResources = resources.filter(resource => {
    const matchesSearch = searchQuery === '' || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const resourcesByCategory = RESOURCE_CATEGORIES.reduce((acc, category) => {
    acc[category] = resources.filter(r => r.category === category).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAddResource = () => {
    setEditingResource(null);
    setFormDialogOpen(true);
  };

  const handleEditResource = (resource: ClassroomResource) => {
    setEditingResource(resource);
    setFormDialogOpen(true);
  };

  const handleDeleteResource = (resource: ClassroomResource) => {
    setDeletingResource(resource);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: ClassroomResourceInsert) => {
    try {
      if (editingResource) {
        await updateResource.mutateAsync({ id: editingResource.id, updates: data });
        toast.success('Resource updated successfully');
      } else {
        await addResource.mutateAsync(data);
        toast.success('Resource added successfully');
      }
      setFormDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save resource');
    }
  };

  const handleImport = async (data: ClassroomResourceInsert[]) => {
    try {
      await importResources.mutateAsync(data);
      toast.success(`Imported ${data.length} resource${data.length !== 1 ? 's' : ''} successfully`);
      setImportDialogOpen(false);
    } catch (error) {
      toast.error('Failed to import resources');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingResource) return;
    try {
      await deleteResource.mutateAsync(deletingResource.id);
      toast.success('Resource deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingResource(null);
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your classroom resources and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Classroom Resources</CardTitle>
                  <CardDescription>
                    Resources the AI uses to make personalized recommendations in member outreach.
                    {resources.length > 0 && ` ${resources.length} resource${resources.length !== 1 ? 's' : ''} total.`}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button onClick={handleAddResource}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    All ({resources.length})
                  </TabsTrigger>
                  {RESOURCE_CATEGORIES.map((category) => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {category} ({resourcesByCategory[category] || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading resources...</div>
                  ) : filteredResources.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {resources.length === 0 ? (
                        <div className="space-y-2">
                          <p>No resources yet.</p>
                          <p className="text-sm">Add classroom resources so the AI can make specific recommendations in member DMs.</p>
                        </div>
                      ) : (
                        'No resources match your search.'
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filteredResources.map((resource) => (
                        <ResourceCard
                          key={resource.id}
                          resource={resource}
                          onEdit={handleEditResource}
                          onDelete={handleDeleteResource}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </main>

      <ResourceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        resource={editingResource}
        onSubmit={handleFormSubmit}
        isLoading={addResource.isPending || updateResource.isPending}
      />

      <ImportResourcesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
        isLoading={importResources.isPending}
      />

      <DeleteResourceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        resource={deletingResource}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteResource.isPending}
      />
    </div>
  );
}
