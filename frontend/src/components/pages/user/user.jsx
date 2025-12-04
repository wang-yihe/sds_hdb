import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import useUser from '@/hooks/useUser';
import CreateUserForm from '@/components/pages/user/createUserForm';
import UsersList from '@/components/pages/user/userList';
import EditUserModal from '@/components/pages/user/editUserModal';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const {
    userList,
    loadingFlags,
    hasUsers,
    register,
    handleSubmit,
    errors,
    loadUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    clearForm,
    setValue,
  } = useUser();

  const currentUser = useSelector((state) => state.auth.user);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const onCreateSubmit = async (data) => {
    await handleCreateUser(data);
    clearForm();
  };

  const handleEditClick = (user) => {
    setEditingUser(user);
    setValue('name', user.name);
    setValue('email', user.email);
    setValue('password', '');
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingUser(null);
    clearForm();
  };

  const onEditSubmit = async (data) => {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) updateData.password = data.password;

    await handleUpdateUser(editingUser.id, updateData);
    handleEditModalClose();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto py-6">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>
        </div>
      </div>

      <main className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="lg:col-span-1">
            <CreateUserForm
              register={register}
              handleSubmit={handleSubmit}
              errors={errors}
              onSubmit={onCreateSubmit}
              isLoading={loadingFlags.isSaving}
            />
          </div>

          {/* Users List */}
          <div className="lg:col-span-2">
            <UsersList
              userList={userList}
              hasUsers={hasUsers}
              isLoading={loadingFlags.isAwaitingResponse}
              currentUserId={currentUser?.id}
              onRefresh={loadUsers}
              onEdit={handleEditClick}
              onDelete={handleDeleteUser}
            />
          </div>
        </div>
      </main>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        onSubmit={onEditSubmit}
        register={register}
        handleSubmit={handleSubmit}
        isLoading={loadingFlags.isSaving}
      />
    </div>
  );
}