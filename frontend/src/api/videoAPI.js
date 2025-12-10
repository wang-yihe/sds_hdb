import { axiosInstance } from "@/api/axiosInstance";

const generateVideo = async (videoData) => {
    try {
        const response = await axiosInstance.post("/video/generate", videoData);
        console.log("Video generation response:", response);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.detail || error.message || error;
        throw new Error(errorMessage);
    }
};

const getVideoFile = async (filename) => {
    try {
        const response = await axiosInstance.get(`/video/file/${filename}`, {
            responseType: 'blob'
        });
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.detail || error.message || error;
        throw new Error(errorMessage);
    }
};

export default {
    generateVideo,
    getVideoFile
};
