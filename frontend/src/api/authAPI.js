import { axiosInstance } from "@/api/axiosInstance";

const loginUser = async (userForm) => {
    try {
        const response = await axiosInstance.post("/auth/login", userForm);
        return response.data;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

const validateToken = async () => {
    try {
        const response = await axiosInstance.get("/auth/validate");
        return response.data;
    } catch (error) {
        const errorMessage = error?.response?.data?.message || error.message || error;
        throw new Error(errorMessage);
    }
};

export default {
    loginUser,
    validateToken,
};
