import {Navigate, Route, Routes} from "react-router-dom"
import MainLayout from "@/layout/MainLayout"
import LoginLayout from "@/layout/LoginLayout"
import ProtectedRoute from "@/auth/ProtectedRoute"
import PublicRoute from "@/auth/PublicRoute"
import Canvas from "@/components/pages/canvas"

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
                    <Route path = "/Canvas" element = {<Canvas />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default AppRouter
