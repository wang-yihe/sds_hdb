import { axiosInstance } from '@/api/axiosInstance';

const getCanvas = async (projectId) => {
    const response = await axiosInstance.get(`/canvas/get_canvas/${projectId}`);
    return response;
};

const saveCanvas = async (projectId, canvasData) => {
    const response = await axiosInstance.put(
        `/canvas/save_canvas/${projectId}`,
        canvasData
    );
    return response;
};

const deleteCanvas = async (projectId) => {
    const response = await axiosInstance.delete(`/canvas/delete_canvas/${projectId}`);
    return response;
};

const createEmptyCanvas = async (projectId) => {
    const response = await axiosInstance.post(`/canvas/create_empty_canvas/${projectId}`);
    return response;
};

export { getCanvas, saveCanvas, deleteCanvas, createEmptyCanvas };