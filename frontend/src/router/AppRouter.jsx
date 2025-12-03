import Login from "@/components/login/login"
import {Navigate, Route, Routes} from "react-router-dom"
import MainLayout from "@/layout/MainLayout"
import LoginLayout from "@/layout/LoginLayout"
import ProtectedRoute from "@/auth/ProtectedRoute"
import PublicRoute from "@/auth/PublicRoute"
import Canvas from "@/components/pages/canvas/canvas"
import TestCanvas from "@/components/pages/test-canvas"
import User from "@/components/pages/user"

const AppRouter = () => {
    return(
        <Routes> 
            <Route element = {<PublicRoute />}>
                 <Route element = {<LoginLayout />}>
                    <Route path = "/login" element = {<Login />} />
                    {/*remove routes from testing later*/}
                    <Route path = "/canvas" element = {<Canvas />} />
                    <Route path = "/users" element = {<User />} />                   
                 </Route>
            </Route>
            <Route element = {<ProtectedRoute />}>
                <Route element = {<MainLayout />}>
                    <Route path = "/" element = {<Canvas />} />
                    <Route path = "/canvas" element = {<Canvas />} />
                    <Route path = "/users" element = {<User />} />
                </Route>
            </Route>
        </Routes>
    )
}

export default AppRouter
