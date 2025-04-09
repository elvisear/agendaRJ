import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'operator' | 'master' | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, requiredRole = null }) => {
  console.log("AppLayout rendering with requiredRole:", requiredRole);
  
  const { isAuthenticated, userRole, currentUser } = useAuth();
  const location = useLocation();
  
  console.log("AppLayout auth state:", { isAuthenticated, userRole, currentUserExists: !!currentUser });
  console.log("Current location:", location.pathname);

  useEffect(() => {
    console.log("AppLayout mounted with auth state:", { isAuthenticated, userRole });
  }, [isAuthenticated, userRole]);

  // Check authentication for all protected pages
  if (!isAuthenticated) {
    console.log("AppLayout redirecting to login - not authenticated");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no specific role is required, or dashboard is being accessed
  if (requiredRole === null || location.pathname === '/dashboard') {
    console.log("AppLayout rendering with sidebar - general access");
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
