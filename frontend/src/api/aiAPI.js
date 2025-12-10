import { axiosInstance } from "@/api/axiosInstance";

const generateAllSmart = async (generationForm) => {
    try {
        const response = await axiosInstance.post("/ai/generate_all_smart", generationForm);
        console.log("AI generation response:", response);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const editLasso = async (editData) => {
    try {
        const response = await axiosInstance.post("/ai/edit_lasso", editData);
        console.log("Lasso edit response:", response);
        return response;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

export default { generateAllSmart, editLasso };

