import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, X, UserPlus, Upload, Mail, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function EditProjectModal({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onAddCollaborator,
  onRemoveCollaborator,
  isLoading,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setThumbnailPreview(project.thumbnail || null);
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const updateData = {
      name,
      description,
    };

    // Handle thumbnail upload if new file selected
    if (thumbnailFile) {
      // TODO: Upload thumbnail to storage and get URL
      // For now, you can use the base64 preview or implement upload logic
      // updateData.thumbnail = uploadedUrl;
      console.log('Thumbnail file to upload:', thumbnailFile);
    }

    await onUpdateProject(project.id, updateData);
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(collaboratorEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    await onAddCollaborator(project.id, collaboratorEmail);
    setCollaboratorEmail('');
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleClose = () => {
    setCollaboratorEmail('');
    setThumbnailFile(null);
    onClose();
  };

  const getInitials = (email) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details, thumbnail, and manage collaborators
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Project Details Section */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-muted-foreground">
                PROJECT DETAILS
              </div>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter project name"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter project description"
                    className="h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Thumbnail Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-semibold text-muted-foreground">
                PROJECT THUMBNAIL
              </div>
              
              <div className="grid gap-4">
                {thumbnailPreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border group">
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => document.getElementById('thumbnail-upload').click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveThumbnail}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hover over image to change or remove
                    </p>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
                    onClick={() => document.getElementById('thumbnail-upload').click()}
                  >
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">Click to upload thumbnail</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or GIF (max 5MB, recommended 800x600px)
                    </p>
                  </div>
                )}
                <Input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Collaborators Section */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <div className="text-sm font-semibold text-muted-foreground mb-1">
                  COLLABORATORS
                </div>
                <p className="text-xs text-muted-foreground">
                  Add people who can view and edit this project
                </p>
              </div>

              {/* Add Collaborator Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter email address"
                    type="email"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCollaborator();
                      }
                    }}
                    className="pl-10"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddCollaborator}
                  disabled={!collaboratorEmail.trim() || isLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Collaborator List */}
              <div className="space-y-2">
                {/* Check both collaborators array and collaborator_ids for backwards compatibility */}
                {(project.collaborators && project.collaborators.length > 0) || (project.collaborator_ids && project.collaborator_ids.length > 0) ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {/* Prefer collaborators array if available, fallback to collaborator_ids */}
                    {(project.collaborators && project.collaborators.length > 0
                      ? project.collaborators
                      : (project.collaborator_ids || []).map((id, index) => ({ id, email: `Loading...` }))
                    ).map((collaborator, index) => (
                      <div
                        key={collaborator.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {collaborator.email && collaborator.email !== 'Loading...'
                                ? getInitials(collaborator.email)
                                : (index + 1).toString()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {collaborator.email || `Collaborator ${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ID: {collaborator.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => collaborator.email && collaborator.email !== 'Loading...'
                            ? onRemoveCollaborator(project.id, collaborator.email)
                            : null}
                          disabled={isLoading || !collaborator.email || collaborator.email === 'Loading...'}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed rounded-lg">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No collaborators yet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add people by their email address
                    </p>
                  </div>
                )}
              </div>

              {/* Owner Badge */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Badge variant="secondary">Owner</Badge>
                <p className="text-xs text-muted-foreground">
                  You have full control over this project
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}