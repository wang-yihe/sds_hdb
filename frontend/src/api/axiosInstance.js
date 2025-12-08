import axios from "axios";
import { store } from "@/store/store";
import { hideGlobalLoader, showGlobalLoader } from "@/store/slices/globalLoaderSlice";

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }  
});

axiosInstance.interceptors.request.use((config) => {
    store.dispatch(showGlobalLoader());
    const token = store.getState().auth.access_token;
    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use((response) => {
    store.dispatch(hideGlobalLoader());
    console.log('Response:', response);
    return response;
},
(error) => {
    store.dispatch(hideGlobalLoader());
    return Promise.reject(error);
});