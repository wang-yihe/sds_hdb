import { useDispatch, useSelector } from "react-redux";
import { validateToken } from "@/store/thunks/authThunks";
import { use, useEffect } from "react";   

const AuthBootstrapper = () => {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector((state) => state.auth);

    useEffect(() => {
        if (isAuthenticated){
            dispatch(validateToken());
        }
        },[isAuthenticated, dispatch]);

    return null;
}   

export default AuthBootstrapper;    