import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Trash2, Settings, Image as ImageIcon } from 'lucide-react';

export default function ProjectCard({ 
  project, 
  onClick, 
  onEdit, 
  onDelete 
}) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);

    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return days === 1 ? "Yesterday" : `${days} days ago`;
    if (weeks < 4) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      onClick={() => onClick(project.id)}
      className="cursor-pointer hover:shadow-lg transition group overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-muted">
        {project.thumbnail ? (
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Shared badge */}
        {project.collaborator_ids && project.collaborator_ids.length > 0 && (
          <Badge className="absolute top-2 left-2" variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            Shared
          </Badge>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project);
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project info */}
      <CardHeader>
        <h3 className="font-semibold text-lg truncate">{project.name}</h3>
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
      </CardHeader>

      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          {formatDate(project.updated_at)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {(project.collaborator_ids?.length || 0) + 1}
        </span>
      </CardFooter>
    </Card>
  );
}