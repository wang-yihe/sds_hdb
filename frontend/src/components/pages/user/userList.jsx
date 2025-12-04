import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Pencil, Trash2, Users } from 'lucide-react';

export default function UsersList({
  userList,
  hasUsers,
  isLoading,
  currentUserId,
  onRefresh,
  onEdit,
  onDelete,
}) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Users List</CardTitle>
            <CardDescription>
              {hasUsers ? `${userList.length} users in the system` : 'Manage all users'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && userList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading users...</p>
          </div>
        ) : !hasUsers ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No users found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by creating a new user.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userList.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{user.name}</h3>
                        {currentUserId === user.id && (
                          <Badge variant="outline">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={user.is_active ? "success" : "destructive"}>
                          {user.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {user.must_change_password && (
                          <Badge variant="warning">Must Change Password</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatDate(user.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {currentUserId === user.id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(user)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          title="You can only edit your own profile"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      
                      {currentUserId === user.id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDelete(user.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}