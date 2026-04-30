import { useState } from 'react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { BlogPost, BlogPostInsert, BLOG_CATEGORIES } from '@/types/blogPost';
import { BlogPostCard } from '@/components/settings/BlogPostCard';
import { BlogPostFormDialog } from '@/components/settings/BlogPostFormDialog';
import { ImportBlogPostsDialog } from '@/components/settings/ImportBlogPostsDialog';
import { DeleteItemDialog } from '@/components/settings/DeleteItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

export function BlogPostsSection() {
  const { posts, isLoading, addPost, updatePost, deletePost, importPosts } = useBlogPosts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [deleting, setDeleting] = useState<BlogPost | null>(null);

  const filtered = posts.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.keywords?.some(k => k.toLowerCase().includes(q));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const countByCategory = BLOG_CATEGORIES.reduce((acc, c) => {
    acc[c] = posts.filter(p => p.category === c).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (p: BlogPost) => { setEditing(p); setFormOpen(true); };
  const handleDelete = (p: BlogPost) => { setDeleting(p); setDeleteOpen(true); };

  const handleSubmit = async (data: BlogPostInsert) => {
    try {
      if (editing) {
        await updatePost.mutateAsync({ id: editing.id, updates: data });
        toast.success('Post updated');
      } else {
        await addPost.mutateAsync(data);
        toast.success('Post added');
      }
      setFormOpen(false);
    } catch { toast.error('Failed to save post'); }
  };

  const handleImport = async (data: BlogPostInsert[]) => {
    try {
      await importPosts.mutateAsync(data);
      toast.success(`Imported ${data.length} post${data.length !== 1 ? 's' : ''}`);
      setImportOpen(false);
    } catch { toast.error('Failed to import posts'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await deletePost.mutateAsync(deleting.id);
      toast.success('Post deleted');
      setDeleteOpen(false); setDeleting(null);
    } catch { toast.error('Failed to delete post'); }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Blog Posts</CardTitle>
                <CardDescription>
                  Articles the AI can recommend in DMs and welcome posts based on what members say they want to learn.
                  {posts.length > 0 && ` ${posts.length} post${posts.length !== 1 ? 's' : ''} loaded.`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add Post
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search posts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">All ({posts.length})</TabsTrigger>
                {BLOG_CATEGORIES.map(c => (
                  <TabsTrigger key={c} value={c} className="text-xs">{c} ({countByCategory[c] || 0})</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {posts.length === 0 ? (
                      <div className="space-y-2">
                        <p>No blog posts yet.</p>
                        <p className="text-sm">Import your blog inventory so the AI can match members to specific articles.</p>
                      </div>
                    ) : 'No posts match your search.'}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtered.map(p => (
                      <BlogPostCard key={p.id} post={p} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <BlogPostFormDialog open={formOpen} onOpenChange={setFormOpen} post={editing} onSubmit={handleSubmit} isLoading={addPost.isPending || updatePost.isPending} />
      <ImportBlogPostsDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} isLoading={importPosts.isPending} />
      <DeleteItemDialog open={deleteOpen} onOpenChange={setDeleteOpen} itemName={deleting?.title || ''} itemType="Post" onConfirm={handleDeleteConfirm} isLoading={deletePost.isPending} />
    </>
  );
}
