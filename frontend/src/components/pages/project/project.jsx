import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useProject from "@/hooks/useProject";
import ProjectsHeader from "./projectHeader";
import ProjectsGrid from "./projectGrid";
import CreateProjectDialog from "./createProjectDialog";
import EditProjectModal from "./editProjectModal";

const Project = () => {
  const navigate = useNavigate();
  const {
    projectList,
    loadingFlags,
    hasProjects,
    loadProjects,
    createNewProject,
    updateExistingProject,
    deleteExistingProject,
    addProjectCollaborator,
    removeProjectCollaborator,
  } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projectList.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (projectId) => {
    navigate(`/canvas/${projectId}`);
  };

  const handleCreateProject = async () => {
    try {
      await createNewProject({
        name: newProjectName,
        description: newProjectDescription,
      });
      setShowCreateModal(false);
      setNewProjectName("");
      setNewProjectDescription("");
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleUpdateProject = async (projectId, updateData) => {
    try {
      await updateExistingProject(projectId, updateData);
      setShowEditModal(false);
      setEditingProject(null);
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  const handleAddCollaborator = async (projectId, email) => {
    try {
      await addProjectCollaborator(projectId, email);
    } catch (error) {
      console.error("Failed to add collaborator:", error);
    }
  };

  const handleRemoveCollaborator = async (projectId, collaboratorId) => {
    try {
      await removeProjectCollaborator(projectId, collaboratorId);
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    }
  };

  const handleDelete = async (projectId) => {
    await deleteExistingProject(projectId);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewProjectName("");
    setNewProjectDescription("");
  };

  if (loadingFlags.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <ProjectsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateClick={() => setShowCreateModal(true)}
      />

      <ProjectsGrid
        projects={filteredProjects}
        viewMode={viewMode}
        onCreateClick={() => setShowCreateModal(true)}
        onProjectClick={handleProjectClick}
        onProjectEdit={handleEditClick}
        onProjectDelete={handleDelete}
        hasProjects={hasProjects}
        isLoading={loadingFlags.isLoading}
      />

      <CreateProjectDialog
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateProject}
        name={newProjectName}
        setName={setNewProjectName}
        description={newProjectDescription}
        setDescription={setNewProjectDescription}
        isLoading={loadingFlags.isSaving}
      />

      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
        }}
        project={editingProject}
        onUpdateProject={handleUpdateProject}
        onAddCollaborator={handleAddCollaborator}
        onRemoveCollaborator={handleRemoveCollaborator}
        isLoading={loadingFlags.isSaving}
      />
    </div>
  );
};

export default Project;
