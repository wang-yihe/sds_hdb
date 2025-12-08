import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { findAllUsers, createUser, updateUser, deleteUser } from "@/store/slices/userSlice";

const useUser = () => {
    const dispatch = useDispatch();
    const { userList, loadingFlags } = useSelector((state) => state.user);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
        setValue,
        watch
    } = useForm({
        defaultValues: {
            name: "",
            email: "",
            password: ""
        }
    });

    const loadUsers = async () => {
        try {
            await dispatch(findAllUsers()).unwrap();
        } catch (error) {
            alert("Failed to load users: " + error);
        }
    };

    const handleCreateUser = async (userData) => {
        try {
            await dispatch(createUser(userData)).unwrap();
            reset(); 
            alert("User created successfully!");
        } catch (error) {
            alert("Failed to create user: " + error);
        }
    };

    // Add this new function
    const handleUpdateUser = async (userId, userData) => {
        try {
            await dispatch(updateUser({ id: userId, userData })).unwrap();
            alert("User updated successfully!");
        } catch (error) {
            alert("Failed to update user: " + error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await dispatch(deleteUser(userId)).unwrap();
                alert("User deleted successfully!");
            } catch (error) {
                alert("Failed to delete user: " + error);
            }
        }
    };

    const clearForm = () => {
        reset();
    };

    const hasUsers = userList.length > 0;

    const getUserById = (id) => {
        return userList.find(user => user.id === id);
    };

    return {
        // State
        userList,
        loadingFlags,
        hasUsers,
        
        // Form controls
        register,
        handleSubmit,
        errors,
        watch,
        setValue,
        
        // Actions
        loadUsers,
        handleCreateUser,
        handleUpdateUser, // Add this to exports
        handleDeleteUser,
        clearForm,
        getUserById
    };
};

export default useUser;