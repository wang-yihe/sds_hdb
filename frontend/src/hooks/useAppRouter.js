import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const useAppRouter = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const lastValidPath = useRef(''); // fallback

    const validRoutes = [
        '/canvas',
        '/user',
        '/project',
        '/',
        // Add your app's valid routes here
    ];

    useEffect(() => {
        if (validRoutes.includes(location.pathname)) {
            lastValidPath.current = location.pathname;
        }
    }, [location.pathname, validRoutes]);

    const goBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else if (lastValidPath.current && lastValidPath.current !== location.pathname) {
            navigate(lastValidPath.current);
        } else {
            navigate('/project');
        }
    };

    return {
        navigate,
        pathname: location.pathname,
        state: location.state,
        lastValidPath: lastValidPath.current,
        validRoutes: validRoutes,
        goBack
    };
};

export default useAppRouter;
