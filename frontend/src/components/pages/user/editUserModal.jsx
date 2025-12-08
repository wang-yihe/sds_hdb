import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function EditUserModal({
  isOpen,
  onClose,
  onSubmit,
  register,
  handleSubmit,
  isLoading,
}) {
  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Your Profile</DialogTitle>
          <DialogDescription>
            Update your name, email, or password
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                {...register('name')}
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                {...register('email')}
                placeholder="john@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-password">Password (Optional)</Label>
              <Input
                id="edit-password"
                type="password"
                {...register('password')}
                placeholder="Leave blank to keep current password"
              />
              <p className="text-xs text-muted-foreground">
                Only fill this if you want to change your password (min 8 characters)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}