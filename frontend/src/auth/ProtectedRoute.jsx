import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import useAppRouter from '@/hooks/useAppRouter';

const ProtectedRoute = () => {
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated); 
  const {navigate, state} = useAppRouter();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;