import { axiosInstance } from "@/api/axiosInstance";

const findAllUser = async () => {
  try {
    const response = await axiosInstance.get("/user/find-all");
    return response.data;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const createUser = async () => {
  try {
    const response = await axiosInstance.post("/user/create", data);
    return response.data;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const deleteUser = async () => {
  try {
    const response = await axiosInstance.delete(`/user/delete/${id}`);
    return response.data;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

export default {
  findAllUser,
  createUser,
  deleteUser,
};