import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'operator' | 'master' | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, requiredRole = null }) => {
  console.log("AppLayout rendering with requiredRole:", requiredRole);
  
  const { isAuthenticated, userRole, currentUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  console.log("AppLayout auth state:", { isAuthenticated, userRole, currentUserExists: !!currentUser });
  console.log("Current location:", location.pathname);

  useEffect(() => {
    console.log("AppLayout mounted with auth state:", { isAuthenticated, userRole });
  }, [isAuthenticated, userRole]);

  // Close sidebar when location changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Check authentication for all protected pages
  if (!isAuthenticated) {
    console.log("AppLayout redirecting to login - not authenticated");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se o usuário está ativo
  if (currentUser?.isActive === false) {
    console.log("AppLayout redirecting to login - user is inactive");
    toast.error("Seu usuário está inativo no sistema! Por favor entre em contato com a administração do sistema.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific role is required, or dashboard is being accessed
  if (requiredRole === null || location.pathname === '/dashboard') {
    console.log("AppLayout rendering with sidebar - general access");
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Mobile Sidebar Toggle */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white p-3 flex items-center justify-between border-b shadow-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex items-center justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-primary">AgendaRJ</h1>
          </div>
          <div className="w-8"></div> {/* Spacer para balancear o layout */}
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - responsive */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-[85%] max-w-[260px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pt-14 lg:pt-0">
          {children}
        </main>
      </div>
    );
  }

  // For specific role requirements
  
  // If specific role is required and user doesn't have it
  if (requiredRole === 'master' && userRole !== 'master') {
    console.log("AppLayout redirecting to dashboard - not a master");
    return <Navigate to="/dashboard" replace />;
  }

  // For operator role, both operator and master can access
  if (requiredRole === 'operator' && userRole !== 'operator' && userRole !== 'master') {
    console.log("AppLayout redirecting to dashboard - not operator or master");
    return <Navigate to="/dashboard" replace />;
  }

  // If role requirement is satisfied, show layout with sidebar
  console.log("AppLayout rendering with sidebar - role access");
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white p-3 flex items-center justify-between border-b shadow-sm">
        <Button 
          variant="ghost" 
          size="icon" 
          className="flex items-center justify-center"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-primary">AgendaRJ</h1>
        </div>
        <div className="w-8"></div> {/* Spacer para balancear o layout */}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - responsive */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[85%] max-w-[260px] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
