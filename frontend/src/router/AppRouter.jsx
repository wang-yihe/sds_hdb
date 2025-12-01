import Login from "@/components/login/login"
import {Navigate, Route, Routes} from "react-router-dom"
import MainLayout from "@/layout/MainLayout"
import LoginLayout from "@/layout/LoginLayout"
import ProtectedRoute from "@/auth/ProtectedRoute"
import PublicRoute from "@/auth/PublicRoute"
import Canvas from "@/components/pages/canvas"
import TestCanvas from "@/components/pages/test-canvas"
import User from "@/components/pages/user"

const AppRouter = () => {
    return(
        <Routes> 
            <Route element = {<PublicRoute />}>
                 <Route element = {<LoginLayout />}>
                    <Route path = "/login" element = {<Login />} />
                 </Route>
            </Route>
            <Route element = {<ProtectedRoute />}>
                <Route element = {<MainLayout />}>
                    <Route path = "/" element = {<Navigate to ="/login" replace />} />
                    <Route path = "/canvas" element = {<Canvas />} />
                    <Route path = "/user" element = {<User />} />
                </Route>
            </Route>
            {/* Temporary: Canvas accessible without login */}
            <Route path = "/" element = {<Canvas />} />
            <Route path = "/canvas" element = {<Canvas />} />
        </Routes>
    )
}

export default AppRouter
