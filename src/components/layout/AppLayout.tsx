import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { Menu, Calendar } from 'lucide-react';
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
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white p-2.5 flex items-center justify-between border-b shadow-sm">
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
            <span className="ml-1.5 text-sm font-medium">Menu</span>
          </Button>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1 text-primary" />
            <h1 className="text-base font-semibold text-primary">AgendaRJ</h1>
          </div>
          <div className="w-16"></div> {/* Spacer para balancear o layout */}
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - redesenhada para ocupar menos espaço e ser mais usável */}
        <div className={`
          fixed inset-y-0 left-0 z-40 w-[240px] transform transition-transform duration-300 ease-in-out 
          lg:translate-x-0 lg:static lg:w-64 lg:h-screen lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content - ajustado para ter melhor padding em mobile */}
        <main className="flex-1 w-full max-w-full overflow-auto pt-12 pb-6 px-3 lg:px-6 lg:pt-0">
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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white p-2.5 flex items-center justify-between border-b shadow-sm">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center justify-center"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
          <span className="ml-1.5 text-sm font-medium">Menu</span>
        </Button>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 mr-1 text-primary" />
          <h1 className="text-base font-semibold text-primary">AgendaRJ</h1>
        </div>
        <div className="w-16"></div> {/* Spacer para balancear o layout */}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - redesenhada para ocupar menos espaço e ser mais usável */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[240px] transform transition-transform duration-300 ease-in-out 
        lg:translate-x-0 lg:static lg:w-64 lg:h-screen lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content - ajustado para ter melhor padding em mobile */}
      <main className="flex-1 w-full max-w-full overflow-auto pt-12 pb-6 px-3 lg:px-6 lg:pt-0">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
