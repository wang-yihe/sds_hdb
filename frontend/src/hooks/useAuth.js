import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { loginUser } from "@/store/thunks/authThunks";

const useAuth = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            email: "",
            password: ""
        }
    });
    
    const { user, loadingFlags } = useSelector((state) => state.auth);

    const handleLogin = async (data) => {
        try {
            const resultAction = await dispatch(loginUser(data)).unwrap();
            navigate("/user");
            alert(`Welcome ${data.email}!`);
        } catch (error) {
            alert("Login failed: " + (error.message || error));
        }
    };

    return {
        register,
        handleSubmit,
        handleLogin,
        errors,
        loadingFlags,
        user
    };
};

export default useAuth;