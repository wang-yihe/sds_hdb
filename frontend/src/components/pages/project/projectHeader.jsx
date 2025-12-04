import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Plus, Grid3x3, List } from 'lucide-react';

export default function ProjectsHeader({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onCreateClick,
  userInitials = 'JD',
}) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("grid")}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => onViewModeChange("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>

        <Avatar>
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}