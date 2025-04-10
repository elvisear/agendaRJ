import { Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, Clock, Home, Map, Settings, Users, BarChart, List, LogOut, Wrench, MapPin, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { api } from "@/services/api";

interface SidebarLinkProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, label, icon, isActive }) => {
  const navigate = useNavigate();
  
  return (
    <li>
      <button
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 w-full rounded-md transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground font-medium" 
            : "hover:bg-gray-100 text-gray-700"
        )}
        onClick={() => navigate(to)}
      >
        <span className="w-5 h-5 flex-shrink-0">{icon}</span>
        <span className="text-sm">{label}</span>
      </button>
    </li>
  );
};

export default function Sidebar({ onCloseMobile }) {
  const { pathname } = useLocation();
  const { userRole, logout, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  console.log("Sidebar - Current user role:", userRole);
  console.log("Sidebar - Is authenticated:", isAuthenticated);

  // Definição de todas as rotas possíveis
  const routes = [
    { path: "/dashboard", label: "Início", icon: <Home />, roles: ["user", "operator", "master"], requiresAuth: true },
    { path: "/appointments", label: "Agendamentos", icon: <Calendar />, roles: ["user", "operator", "master"], requiresAuth: false },
    { path: "/appointments-management", label: "Atendimento", icon: <List />, roles: ["operator", "master"], requiresAuth: true },
    { path: "/task-distribution", label: "Distribuição de Tarefas", icon: <Clock />, roles: ["master"], requiresAuth: true },
    { path: "/service-locations", label: "Postos de Atendimento", icon: <Map />, roles: ["master"], requiresAuth: true },
    { path: "/users", label: "Usuários", icon: <Users />, roles: ["master"], requiresAuth: true },
    { path: "/admin", label: "Administração", icon: <Settings />, roles: ["master"], requiresAuth: true },
    { path: "/statistics", label: "Estatísticas", icon: <BarChart />, roles: ["master"], requiresAuth: true },
  ];
  
  // Filtra rotas com base no papel do usuário e estado de autenticação
  const availableRoutes = routes.filter(route => {
    // Se a rota requer autenticação e o usuário não está autenticado, não mostrar
    if (route.requiresAuth && !isAuthenticated) {
      return false;
    }
    
    // Se a rota não requer autenticação, mostrar independentemente de papel
    if (!route.requiresAuth) {
      return true;
    }
    
    // Se chegou aqui, a rota requer autenticação e o usuário está autenticado
    // Então verificamos se o papel do usuário tem acesso
    return route.roles.includes(userRole || '');
  });

  console.log("Sidebar - Available routes:", availableRoutes.map(r => r.path));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavigate = (to) => {
    navigate(to);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <div className="h-full bg-white shadow-sm flex-shrink-0 w-[240px] flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-1.5 text-primary" />
          <h2 className="text-base font-medium text-primary">Menu</h2>
        </div>
        {onCloseMobile && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden h-7 w-7 p-0" 
            onClick={onCloseMobile}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </Button>
        )}
      </div>
      
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {availableRoutes.map((route) => (
            <SidebarLink
              key={route.path}
              to={route.path}
              label={route.label}
              icon={route.icon}
              isActive={pathname === route.path}
            />
          ))}
        </ul>
      </nav>
      
      {isAuthenticated && (
        <div className="p-2 border-t">
          <button
            className="flex items-center gap-2 px-3 py-2.5 w-full rounded-md text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}
