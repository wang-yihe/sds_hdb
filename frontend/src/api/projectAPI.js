import { axiosInstance } from "@/api/axiosInstance";

const findAllProjects = async () => {
    try {
        const response = await axiosInstance.get("/project/get_user_projects");
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const createProject = async (data) => {
    try {
        const response = await axiosInstance.post("/project/create_project", data);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const getProjectById = async (projectId) => {
    try {
        const response = await axiosInstance.get(`/project/get_project_by_id/${projectId}`);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const updateProject = async (projectId, data) => {
    try {
        const response = await axiosInstance.put(`/project/update_project/${projectId}`, data);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const deleteProject = async (projectId) => {
    try {
        const response = await axiosInstance.delete(`/project/delete_project/${projectId}`);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const addCollaborator = async (projectId, email) => {
    try {
        const response = await axiosInstance.post(`/project/${projectId}/add_collaborator`, { email });
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const removeCollaborator = async (projectId, email) => {
    try {
        const response = await axiosInstance.delete(`/project/${projectId}/remove_collaborator`, {
            params: { email }  // Changed from 'data' to 'params' for query parameter
        });
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const getUserProjects = async () => {
    try {
        const response = await axiosInstance.get("/project/get_user_projects");
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

export default {
    findAllProjects,
    createProject,
    getProjectById,
    updateProject,
    deleteProject,
    addCollaborator,
    removeCollaborator,
    getUserProjects,
};
