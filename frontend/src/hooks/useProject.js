import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { useCallback } from "react";
import {
  getUserProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addCollaborator,
  removeCollaborator,
  clearCurrentProject,
} from "@/store/slices/projectSlice";

const useProject = () => {
  const dispatch = useDispatch();
  const { projectList, currentProject, loadingFlags } = useSelector(
    (state) => state.project
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const loadProjects = useCallback(async () => {
    try {
      await dispatch(getUserProjects()).unwrap();
    } catch (error) {
      alert("Failed to load projects: " + error);
    }
  }, [dispatch]);

  const loadProjectById = useCallback(async (projectId) => {
    try {
      await dispatch(getProjectById(projectId)).unwrap();
    } catch (error) {
      alert("Failed to load project: " + error);
    }
  }, [dispatch]);

  const handleCreateProject = async (projectData) => {
    try {
      await dispatch(createProject(projectData)).unwrap();
      reset();
      alert("Project created successfully!");
    } catch (error) {
      alert("Failed to create project: " + error);
    }
  };

  const handleUpdateProject = async (projectId, projectData) => {
    try {
      await dispatch(updateProject({ projectId, projectData })).unwrap();
      alert("Project updated successfully!");
    } catch (error) {
      alert("Failed to update project: " + error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        await dispatch(deleteProject(projectId)).unwrap();
        alert("Project deleted successfully!");
      } catch (error) {
        alert("Failed to delete project: " + error);
      }
    }
  };

  const handleAddCollaborator = async (projectId, email) => {
    try {
      await dispatch(addCollaborator({ projectId, email })).unwrap();
      alert("Collaborator added successfully!");
    } catch (error) {
      alert("Failed to add collaborator: " + error);
    }
  };

  const handleRemoveCollaborator = async (projectId, email) => {
    if (window.confirm("Are you sure you want to remove this collaborator?")) {
      try {
        await dispatch(removeCollaborator({ projectId, email })).unwrap();
        alert("Collaborator removed successfully!");
      } catch (error) {
        alert("Failed to remove collaborator: " + error);
      }
    }
  };

  const clearProject = useCallback(() => {
    dispatch(clearCurrentProject());
  }, [dispatch]);

  const getProjectByIdFromList = (id) => {
    return projectList.find((project) => project.id === id);
  };

  const hasProjects = projectList.length > 0;

  return {
    // State
    projectList,
    currentProject,
    loadingFlags,
    hasProjects,

    // Form controls
    register,
    handleSubmit,
    errors,
    watch,
    setValue,

    // Actions
    loadProjects,
    loadProjectById,
    createNewProject: handleCreateProject,
    updateExistingProject: handleUpdateProject,
    deleteExistingProject: handleDeleteProject,
    addProjectCollaborator: handleAddCollaborator,
    removeProjectCollaborator: handleRemoveCollaborator,
    clearProject,
    getProjectByIdFromList,
  };
};

export default useProject;