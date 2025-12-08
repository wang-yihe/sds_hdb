import { axiosInstance } from "@/api/axiosInstance";

const searchPlants = async (data) => {
  try {
    const response = await axiosInstance.post("/rag/search", data);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const searchPlantsWithImages = async (data) => {
  try {
    const response = await axiosInstance.post("/rag/search-with-images", data);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const getPlantDetails = async (botanicalName) => {
  try {
    const response = await axiosInstance.get(`/rag/plant/${encodeURIComponent(botanicalName)}`);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const getExampleQueries = async () => {
  try {
    const response = await axiosInstance.get("/rag/examples");
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

export default {
  searchPlants,
  searchPlantsWithImages,
  getPlantDetails,
  getExampleQueries,
};