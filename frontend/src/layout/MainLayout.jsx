import { Outlet } from "react-router-dom";


const MainLayout = () => {
    return (
        <div cclassName="flex-1 h-full bg-main-bg overflow-auto p-2">
            <Outlet />
        </div>
    )
}

export default MainLayout;
