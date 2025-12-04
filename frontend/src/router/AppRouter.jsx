import Login from "@/components/login/login"
import {Navigate, Route, Routes} from "react-router-dom"
import MainLayout from "@/layout/MainLayout"
import LoginLayout from "@/layout/LoginLayout"
import ProtectedRoute from "@/auth/ProtectedRoute"
import PublicRoute from "@/auth/PublicRoute"
import Canvas from "@/components/pages/canvas/canvas"
import TestCanvas from "@/components/pages/test-canvas"
import User from "@/components/pages/user/user"
import Project from "@/components/pages/project/project"

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
                    <Route path = "/" element = {<Project />} />
                    <Route path="/canvas/:projectId" element={<Canvas />} />
                    <Route path = "/user" element = {<User />} />
                    <Route path = "/project" element = {<Project />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default AppRouter
