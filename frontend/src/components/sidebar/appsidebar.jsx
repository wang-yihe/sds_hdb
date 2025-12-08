import { Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '@/store/thunks/authThunks';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  LayoutDashboard, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { path: '/project',
      label: 'Projects', 
      icon: LayoutDashboard
    },
    {
      path: '/user',
      label: 'User',
      icon: User
    }
  ];

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className={cn(
      "bg-background border-r h-screen flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-xl font-bold">HDB App</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <TooltipProvider delayDuration={0}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              const navButton = (
                <Button
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Link to={item.path}>
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && <span className="ml-3">{item.label}</span>}
                  </Link>
                </Button>
              );

              return (
                <li key={item.path}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navButton
                  )}
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* Logout Button */}
      <div className="p-2">
        <Separator className="mb-2" />
        <TooltipProvider delayDuration={0}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start"
            >
              <LogOut className="h-5 w-5" />
              <span className="ml-3">Logout</span>
            </Button>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
};

export default Sidebar;
