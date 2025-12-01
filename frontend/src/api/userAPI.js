import { axiosInstance } from "@/api/axiosInstance";

const findAllUser = async () => {
  try {
    const response = await axiosInstance.get("/user/get_all_users");
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const createUser = async (data) => {
  try {
    const response = await axiosInstance.post("/user/register", data);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

const updateUser = async (id, data) => {
  try {
    const response = await axiosInstance.put(`/user/update_user/${id}`, data);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};
  
const deleteUser = async (id) => {
  try {
    const response = await axiosInstance.delete(`/user/delete_user/${id}`);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error.message || error;
    throw new Error(errorMessage);
  }
};

export default {
  findAllUser,
  createUser,
  updateUser,
  deleteUser,
};