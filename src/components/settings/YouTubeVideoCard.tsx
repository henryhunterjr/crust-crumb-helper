import { YouTubeVideo } from '@/types/youtubeVideo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, ExternalLink, Youtube } from 'lucide-react';

const skillColors: Record<string, string> = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

interface Props {
  video: YouTubeVideo;
  onEdit: (v: YouTubeVideo) => void;
  onDelete: (v: YouTubeVideo) => void;
}

export function YouTubeVideoCard({ video, onEdit, onDelete }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Youtube className="h-4 w-4 text-destructive shrink-0" />
              <h3 className="font-medium text-foreground truncate">{video.title}</h3>
              {video.video_url && (
                <a href={video.video_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {video.series && <Badge variant="secondary" className="text-xs">{video.series}</Badge>}
              <Badge variant="outline" className={`text-xs ${skillColors[video.skill_level] || ''}`}>{video.skill_level}</Badge>
              {video.duration && <span className="text-xs text-muted-foreground">{video.duration}</span>}
            </div>
            {video.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{video.description}</p>
            )}
            {video.keywords && video.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {video.keywords.slice(0, 5).map((k, i) => (
                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{k}</span>
                ))}
                {video.keywords.length > 5 && <span className="text-xs text-muted-foreground">+{video.keywords.length - 5} more</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(video)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(video)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}