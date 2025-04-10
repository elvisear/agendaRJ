import React, { useEffect, useState, useMemo } from 'react';
import { User, Calendar, CheckCircle, Clock, AlertCircle, X, CalendarPlus, MapPin, ClipboardCheck, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Appointment, ServiceLocation, AppointmentStatus } from '@/types';
import AppointmentCard from '@/components/common/AppointmentCard';
import { Link, useNavigate } from 'react-router-dom';
import { supabaseAdmin } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import AppointmentForm from '@/components/common/AppointmentForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  console.log("Dashboard component initializing");
  
  const { currentUser, updateUserRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Define all state hooks at the top level
  const [stats, setStats] = useState<any>(null);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  
  // Define all computed values after hooks
  const recentAppointments = useMemo(() => {
    // Filtrar agendamentos com locationId válido apenas
    const validAppointments = filteredAppointments.filter(appointment => {
      // Verificar se o locationId existe na lista de locais
      const locationExists = locations.some(loc => loc.id === appointment.locationId);
      if (!locationExists) {
        console.log(`Ignorando agendamento ${appointment.id} com local inválido: ${appointment.locationId}`);
      }
      return locationExists;
    });
    
    // Obter apenas os 3 primeiros agendamentos válidos
    return validAppointments.slice(0, 3);
  }, [filteredAppointments, locations]);

  console.log("Current user from auth context:", currentUser);
  
  // Function to get status icon - moved before any conditional returns
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-status-pending" />;
      case 'waiting':
      case 'assigned':
      case 'in_service':
        return <Clock className="h-5 w-5 text-status-waiting" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-status-completed" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-status-cancelled" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };
  
  // Apply filter function
  const applyStatusFilter = (appointments: Appointment[], filter: string) => {
    if (filter === 'all') {
      return appointments;
    }
    return appointments.filter(a => a.status === filter);
  };
  
  // Handle filter change
  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setFilteredAppointments(applyStatusFilter(allAppointments, value));
  };

  // Function to handle new appointment creation
  const handleNewAppointment = async (data: any) => {
    try {
      console.log('Creating new appointment:', data);
      await api.createAppointment(data);
      toast({
        title: "Agendamento criado com sucesso!",
        description: "Seu agendamento foi registrado no sistema.",
        variant: "default"
      });
      setIsCreateDialogOpen(false);
      
      // Refresh appointments
      fetchAppointmentsBasedOnRole();
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Erro ao criar agendamento",
        description: "Não foi possível criar o agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Separate function to fetch appointments based on role
  const fetchAppointmentsBasedOnRole = async () => {
    try {
      if (!currentUser) return;
      
      // Get all available statuses
      const allStatuses = api.getAllAppointmentStatuses();
      setAvailableStatuses(['all', ...allStatuses]);
      
      if (currentUser?.role === 'operator') {
        console.log("Fetching operator appointments");
        // For operators, show their assigned appointments and appointments linked to their CPF
        const operatorAppointments = await api.getAppointmentsByOperator(currentUser.id);
        const personalAppointments = await api.getAppointmentsByCPF(currentUser.cpf);
        
        // Combine both lists, removing duplicates
        const combinedAppointments = [...operatorAppointments];
        personalAppointments.forEach(app => {
          if (!combinedAppointments.some(a => a.id === app.id)) {
            combinedAppointments.push(app);
          }
        });
        
        setAllAppointments(combinedAppointments);
        setFilteredAppointments(applyStatusFilter(combinedAppointments, statusFilter));
      } else if (currentUser?.role === 'master') {
        console.log("Fetching all appointments for master");
        // For master, fetch all appointments
        const { data, error } = await supabaseAdmin
          .from('appointments')
          .select('*');
          
        if (error) {
          console.error("Error fetching all appointments:", error);
          // Fallback to combination of local methods
          const pendingAppts = await api.getPendingAppointments();
          const inServiceAppts = await api.getAllInServiceAppointments();
          const allAppts = [...pendingAppts, ...inServiceAppts];
          setAllAppointments(allAppts);
          setFilteredAppointments(applyStatusFilter(allAppts, statusFilter));
        } else {
          setAllAppointments(data || []);
          setFilteredAppointments(applyStatusFilter(data || [], statusFilter));
        }
      } else if (currentUser?.role === 'user' && currentUser?.cpf) {
        console.log("Fetching user appointments by CPF:", currentUser.cpf);
        // For regular users, fetch their appointments by CPF
        const userAppointments = await api.getAppointmentsByCPF(currentUser.cpf);
        console.log("User appointments found:", userAppointments.length);
        setAllAppointments(userAppointments);
        setFilteredAppointments(applyStatusFilter(userAppointments, statusFilter));
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Erro ao carregar agendamentos',
        description: 'Não foi possível carregar seus agendamentos',
        variant: 'destructive',
      });
    }
  };
  
  // Main useEffect to fetch data
  useEffect(() => {
    console.log("Dashboard useEffect running, currentUser:", currentUser?.name);
    
    if (!currentUser) {
      return; // Early return inside useEffect is safe
    }
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        console.log("Fetching dashboard data...");
        // Fetch statistics
        const statsData = await api.getStats(currentUser.id, currentUser.role);
        console.log("Stats data received:", statsData);
        setStats(statsData);
        
        // Fetch locations
        const locationsData = await api.getAllServiceLocations();
        setLocations(locationsData);
        
        // Fetch appointments based on user role
        await fetchAppointmentsBasedOnRole();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Não foi possível carregar os dados do dashboard');
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os dados do dashboard',
          variant: 'destructive',
        });
        
        // Definir dados padrão para que o dashboard não fique em branco
        setStats({
          totalAppointments: 0,
          byStatus: {
            pending: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0
          },
          byCity: {},
          byOperator: {}
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser]);
  
  // Apply filter when statusFilter changes
  useEffect(() => {
    if (allAppointments.length > 0) {
      setFilteredAppointments(applyStatusFilter(allAppointments, statusFilter));
    }
  }, [statusFilter, allAppointments]);
  
  // Handle all conditional rendering after all hooks have been called
  if (!currentUser) {
    console.log("No current user found in Dashboard");
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Aguarde um momento</h1>
        <p className="mt-2">Carregando suas informações...</p>
      </div>
    );
  }
  
  // Exibe um estado de carregamento
  if (loading) {
    console.log("Dashboard is in loading state");
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // Exibe a mensagem de erro se houver algum problema
  if (error) {
    console.log("Dashboard encountered an error:", error);
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="bg-red-100 p-4 rounded-full mb-4 inline-flex">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Ocorreu um erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }
  
  // Exibe mensagem de fallback se stats for null
  if (!stats) {
    console.log("Dashboard has no stats data");
    return (
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {currentUser?.name}</h1>
            <p className="text-gray-600 mt-1">
              Este é seu painel de controle do AgendaRJ
            </p>
          </div>
        </div>
        
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <div className="bg-primary/10 inline-flex p-3 rounded-full mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bem-vindo ao AgendaRJ!</h3>
              <p className="text-gray-600 mb-4">
                Estamos preparando seus dados. Por favor, aguarde um momento.
              </p>
              <Button 
                onClick={() => window.location.reload()}
                className="mx-auto"
              >
                Atualizar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  console.log("Dashboard rendering main content");
  
  // Status filter component for all user roles
  const StatusFilterComponent = () => (
    <div className="mb-4 flex items-center">
      <Filter className="mr-2 h-4 w-4 text-gray-500" />
      <Select value={statusFilter} onValueChange={handleFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendentes</SelectItem>
          <SelectItem value="waiting">Em Espera</SelectItem>
          <SelectItem value="assigned">Atribuídos</SelectItem>
          <SelectItem value="in_service">Em Atendimento</SelectItem>
          <SelectItem value="completed">Concluídos</SelectItem>
          <SelectItem value="cancelled">Cancelados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
  
  // Renderização para cada tipo de usuário
  if (currentUser.role === 'user') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Bem-vindo(a), {currentUser.name}</h1>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <CalendarPlus size={20} />
            Novo Agendamento
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Meus Agendamentos</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => navigate('/appointments')}
              >
                Ver Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <StatusFilterComponent />
            
            {filteredAppointments.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentAppointments.map(appointment => (
                    <AppointmentCard 
                      key={appointment.id} 
                      appointment={appointment}
                      location={locations.find(loc => loc.id === appointment.locationId)}
                      showActions={false}
                    />
                  ))}
                </div>
                
                {filteredAppointments.length > 3 && (
                  <div className="text-center mt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/appointments')}
                    >
                      Ver Todos ({filteredAppointments.length})
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  {statusFilter !== 'all' 
                    ? `Nenhum agendamento ${getStatusLabel(statusFilter)} encontrado` 
                    : 'Nenhum agendamento encontrado'}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Criar Novo Agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <CalendarPlus className="h-10 w-10 mb-2" />
                  <span>Novo Agendamento</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/appointments')}
                >
                  <Calendar className="h-10 w-10 mb-2" />
                  <span>Meus Agendamentos</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/locations')}
                >
                  <MapPin className="h-10 w-10 mb-2" />
                  <span>Locais de Atendimento</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => window.open('https://www.gov.br/pt-br/servicos', '_blank')}
                >
                  <ClipboardCheck className="h-10 w-10 mb-2" />
                  <span>Serviços Gov.br</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Horários de Atendimento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Segunda a Sexta</p>
                    <p className="text-sm text-gray-500">08:00 - 17:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-medium">Sábado</p>
                    <p className="text-sm text-gray-500">09:00 - 12:00</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  * Os horários podem variar de acordo com o local de atendimento. Consulte os detalhes específicos de cada unidade.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <AppointmentForm 
              onSubmit={handleNewAppointment}
              onCancel={() => setIsCreateDialogOpen(false)}
              initialData={{
                cpf: currentUser.cpf,
                name: currentUser.name,
                whatsapp: currentUser.whatsapp || '',
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Helper function to get status label
  function getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'pendentes';
      case 'waiting': return 'em espera';
      case 'assigned': return 'atribuídos';
      case 'in_service': return 'em atendimento';
      case 'completed': return 'concluídos';
      case 'cancelled': return 'cancelados';
      default: return '';
    }
  }

  // Renderização para master e operator
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Painel de Controle</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {currentUser.role === 'operator' ? 'Meus Agendamentos' : 'Agendamentos'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {currentUser.role === 'operator' 
                ? `${stats?.byStatus?.inProgress || 0} em andamento` 
                : `${stats?.byStatus?.pending || 0} pendentes`}
            </p>
          </CardContent>
        </Card>
        
        {currentUser.role !== 'operator' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuários
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats?.byOperator || {}).length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Operadores ativos
              </p>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {currentUser.role === 'operator' ? 'Minha Taxa de Conclusão' : 'Taxa de Conclusão'}
            </CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completionRate 
                ? `${stats.completionRate}%` 
                : stats?.byStatus?.completed && (stats?.byStatus?.completed + stats?.byStatus?.inProgress + stats?.byStatus?.pending) > 0 
                  ? `${Math.round((stats.byStatus.completed / (stats.byStatus.completed + stats.byStatus.inProgress + stats.byStatus.pending)) * 100)}%` 
                  : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Dos agendamentos marcados
            </p>
          </CardContent>
        </Card>
          
        {currentUser.role !== 'operator' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Locais Ativos
              </CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats?.byCity || {}).length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Em todo o estado
              </p>
            </CardContent>
          </Card>
        )}
          
        {currentUser.role === 'operator' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Agendamentos Completos
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.byStatus?.completed || 0}</div>
              <p className="text-xs text-muted-foreground">
                Atendimentos finalizados
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {currentUser.role === 'operator' ? 'Meus Agendamentos' : 'Agendamentos'}
            </CardTitle>
            <Button
              variant="outline" 
              onClick={() => navigate('/appointments')}
            >
              Ver Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <StatusFilterComponent />
          
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentAppointments.map(appointment => (
                  <AppointmentCard 
                    key={appointment.id} 
                    appointment={appointment}
                    location={locations.find(loc => loc.id === appointment.locationId)}
                    showActions={false}
                  />
                ))}
              </div>
              
              {filteredAppointments.length > 3 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/appointments')}
                  >
                    Ver Todos ({filteredAppointments.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">
                {statusFilter !== 'all' 
                  ? `Nenhum agendamento ${getStatusLabel(statusFilter)} encontrado` 
                  : 'Nenhum agendamento encontrado'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
