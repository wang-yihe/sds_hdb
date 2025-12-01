import { Outlet } from "react-router-dom";
import Sidebar from "@/components/sidebar/appsidebar.jsx";

const MainLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
