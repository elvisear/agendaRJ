import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'operator' | 'master' | null;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, requiredRole = null }) => {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  // If authentication is required but user is not authenticated
  if (requiredRole && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific role is required and user doesn't have it
  if (requiredRole && userRole && requiredRole === 'master' && userRole !== 'master') {
    return <Navigate to="/dashboard" replace />;
  }

  // For operator role, both operator and master can access
  if (requiredRole && requiredRole === 'operator' && userRole !== 'operator' && userRole !== 'master') {
    return <Navigate to="/dashboard" replace />;
  }

  // If authentication is required, show layout with sidebar
  if (requiredRole) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    );
  }

  // Otherwise, render just the children
  return <>{children}</>;
};

export default AppLayout;
