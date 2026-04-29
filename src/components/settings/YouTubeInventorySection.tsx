import { useState } from 'react';
import { useYouTubeVideos } from '@/hooks/useYouTubeVideos';
import { YouTubeVideo, YouTubeVideoInsert, YOUTUBE_SERIES } from '@/types/youtubeVideo';
import { YouTubeVideoCard } from '@/components/settings/YouTubeVideoCard';
import { YouTubeVideoFormDialog } from '@/components/settings/YouTubeVideoFormDialog';
import { ImportYouTubeVideosDialog } from '@/components/settings/ImportYouTubeVideosDialog';
import { DeleteItemDialog } from '@/components/settings/DeleteItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, Search, Youtube } from 'lucide-react';
import { toast } from 'sonner';

export function YouTubeInventorySection() {
  const { videos, isLoading, addVideo, updateVideo, deleteVideo, importVideos } = useYouTubeVideos();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<YouTubeVideo | null>(null);
  const [deleting, setDeleting] = useState<YouTubeVideo | null>(null);

  const filtered = videos.filter(v => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      v.title.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      v.keywords?.some(k => k.toLowerCase().includes(q));
    const matchesSeries = selectedSeries === 'all' || v.series === selectedSeries;
    return matchesSearch && matchesSeries;
  });

  const countBySeries = YOUTUBE_SERIES.reduce((acc, s) => {
    acc[s] = videos.filter(v => v.series === s).length;
    return acc;
  }, {} as Record<string, number>);

  const handleAdd = () => { setEditing(null); setFormOpen(true); };
  const handleEdit = (v: YouTubeVideo) => { setEditing(v); setFormOpen(true); };
  const handleDelete = (v: YouTubeVideo) => { setDeleting(v); setDeleteOpen(true); };

  const handleSubmit = async (data: YouTubeVideoInsert) => {
    try {
      if (editing) {
        await updateVideo.mutateAsync({ id: editing.id, updates: data });
        toast.success('Video updated');
      } else {
        await addVideo.mutateAsync(data);
        toast.success('Video added');
      }
      setFormOpen(false);
    } catch { toast.error('Failed to save video'); }
  };

  const handleImport = async (data: YouTubeVideoInsert[]) => {
    try {
      await importVideos.mutateAsync(data);
      toast.success(`Imported ${data.length} video${data.length !== 1 ? 's' : ''}`);
      setImportOpen(false);
    } catch { toast.error('Failed to import videos'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await deleteVideo.mutateAsync(deleting.id);
      toast.success('Video deleted');
      setDeleteOpen(false); setDeleting(null);
    } catch { toast.error('Failed to delete video'); }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Youtube className="h-5 w-5 text-destructive" />
              <div>
                <CardTitle>YouTube Inventory</CardTitle>
                <CardDescription>
                  Videos the AI can recommend in DMs and welcome posts based on what members say they want to learn.
                  {videos.length > 0 && ` ${videos.length} video${videos.length !== 1 ? 's' : ''} loaded.`}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" /> Add Video
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            <Tabs value={selectedSeries} onValueChange={setSelectedSeries}>
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="all" className="text-xs">All ({videos.length})</TabsTrigger>
                {YOUTUBE_SERIES.map(s => (
                  <TabsTrigger key={s} value={s} className="text-xs">{s} ({countBySeries[s] || 0})</TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedSeries} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading videos...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {videos.length === 0 ? (
                      <div className="space-y-2">
                        <p>No videos yet.</p>
                        <p className="text-sm">Import your YouTube inventory so the AI can match members to specific videos.</p>
                      </div>
                    ) : 'No videos match your search.'}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filtered.map(v => (
                      <YouTubeVideoCard key={v.id} video={v} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <YouTubeVideoFormDialog open={formOpen} onOpenChange={setFormOpen} video={editing} onSubmit={handleSubmit} isLoading={addVideo.isPending || updateVideo.isPending} />
      <ImportYouTubeVideosDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} isLoading={importVideos.isPending} />
      <DeleteItemDialog open={deleteOpen} onOpenChange={setDeleteOpen} itemName={deleting?.title || ''} itemType="Video" onConfirm={handleDeleteConfirm} isLoading={deleteVideo.isPending} />
    </>
  );
}