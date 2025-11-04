import axios from "axios";
import { store } from "@/store/store";
import { hideGlobalLoader, showGlobalLoader } from "@/store/slices/globalLoaderSlice";

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_SERVER_BASE_URL || "http://localhost:3000/api",
    headers: {
        "Content-Type": "application/json"
    }  
});

axiosInstance.interceptors.request.use((config) => {
    store.dispatch(showGlobalLoader());
    const token = store.getState().auth.token;
    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use((response) => {
    store.dispatch(hideGlobalLoader());
    return response;
},
(error) => {
    store.dispatch(hideGlobalLoader());
    return Promise.reject(error);
});