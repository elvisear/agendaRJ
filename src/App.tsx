import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { Button } from "./components/ui/button";
import { toast } from "./components/ui/sonner";

// Pages
import Index from "./pages/Index";
import Appointments from "./pages/Appointments";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import AppointmentManagement from "./pages/AppointmentManagement";
import ServiceLocations from "./pages/ServiceLocations";
import NotFound from "./pages/NotFound";
import AppointmentsPage from "./pages/Appointments";
import UsersManagement from './pages/Users';

// Layout
import AppLayout from "./components/layout/AppLayout";
import Sidebar from "./components/layout/Sidebar";

// Error Boundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Algo deu errado</h2>
            <p className="text-gray-700 mb-4">Ocorreu um erro inesperado na aplicação.</p>
            <p className="text-sm text-gray-500 p-2 bg-gray-100 rounded mb-4 font-mono overflow-auto">
              {this.state.error?.toString()}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Recarregar a página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Layout de público, que mostra apenas a página sem sidebar
const PublicLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-auto bg-gray-50">
      {children}
    </main>
  </div>
);

const queryClient = new QueryClient();

// Componente principal da aplicação
const AppWithProviders = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

// Componente de conteúdo que tem acesso ao contexto de autenticação
const AppContent = () => {
  return (
    <>
      <Toaster />
      <SonnerToaster />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route 
            path="/appointments" 
            element={
              <PublicLayout>
                <Appointments />
              </PublicLayout>
            } 
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Dashboard é acessível para qualquer usuário autenticado */}
          <Route
            path="/dashboard"
            element={
              <AppLayout requiredRole={null}>
                <Dashboard />
              </AppLayout>
            }
          />
          
          {/* Rotas protegidas que requerem papel de operador ou master */}
          <Route
            path="/appointments-management"
            element={
              <AppLayout requiredRole="operator">
                <AppointmentManagement />
              </AppLayout>
            }
          />
          
          {/* Rotas que requerem papel master */}
          <Route
            path="/task-distribution"
            element={
              <AppLayout requiredRole="master">
                <AppointmentManagement />
              </AppLayout>
            }
          />
          
          <Route
            path="/service-locations"
            element={
              <AppLayout requiredRole="master">
                <ServiceLocations />
              </AppLayout>
            }
          />
          
          <Route
            path="/users"
            element={
              <AppLayout requiredRole="master">
                <UsersManagement />
              </AppLayout>
            }
          />
          
          <Route
            path="/statistics"
            element={
              <AppLayout requiredRole="master">
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Estatísticas</h1>
                  <p className="mt-2 text-gray-600">Página em construção...</p>
                </div>
              </AppLayout>
            }
          />
          
          <Route
            path="/admin"
            element={
              <AppLayout requiredRole="master">
                <div className="p-8">
                  <h1 className="text-3xl font-bold">Administração</h1>
                  <p className="mt-2 text-gray-600">Página em construção...</p>
                </div>
              </AppLayout>
            }
          />
          
          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

export default AppWithProviders;
