
import { useNavigate, useLocation } from "react-router-dom";
import { Calendar, Clock, Home, Map, Settings, Users, BarChart, List, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

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
          "flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-primary-light/20 text-gray-700"
        )}
        onClick={() => navigate(to)}
      >
        <span className="w-5 h-5">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </button>
    </li>
  );
};

export default function Sidebar() {
  const { pathname } = useLocation();
  const { userRole, logout } = useAuth();
  const navigate = useNavigate();

  // Define routes based on user role
  const routes = [
    { path: "/dashboard", label: "Início", icon: <Home />, roles: ["operator", "master"] },
    { path: "/appointments-management", label: "Atendimento", icon: <List />, roles: ["operator", "master"] },
    { path: "/task-distribution", label: "Distribuição de Tarefas", icon: <Clock />, roles: ["master"] },
    { path: "/service-locations", label: "Postos de Atendimento", icon: <Map />, roles: ["master"] },
    { path: "/users", label: "Usuários", icon: <Users />, roles: ["master"] },
    { path: "/admin", label: "Administração", icon: <Settings />, roles: ["master"] },
    { path: "/statistics", label: "Estatísticas", icon: <BarChart />, roles: ["master"] },
  ];
  
  // Filter routes based on user role
  const availableRoutes = routes.filter(route => route.roles.includes(userRole || ''));

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-full bg-white border-r shadow-sm flex-shrink-0 w-64 flex flex-col">
      <div className="p-5 border-b">
        <div className="flex items-center">
          <Calendar className="h-6 w-6 mr-2 text-primary" />
          <h2 className="text-xl font-semibold text-primary">AgendaRJ</h2>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
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
      
      <div className="p-4 border-t">
        <button
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-700 hover:bg-red-100 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>
    </div>
  );
}
