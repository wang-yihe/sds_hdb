import { useSelector, useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { findAllUsers, createUser, deleteUser } from "@/store/slices/userSlice";

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

    // Delete user
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

    // Edit user (populate form with existing data)
    const startEditUser = (user) => {
        setValue("name", user.name);
        setValue("email", user.email);
    };

    // Clear form
    const clearForm = () => {
        reset();
    };

    // Check if user list is empty
    const hasUsers = userList.length > 0;

    // Get user by ID
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
        
        // Actions
        loadUsers,
        handleCreateUser,
        handleDeleteUser,
        startEditUser,
        clearForm,
        getUserById
    };
};

export default useUser;