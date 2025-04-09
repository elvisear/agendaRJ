import { useEffect, useState } from 'react';
import { User, Calendar, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Appointment } from '@/types';
import AppointmentCard from '@/components/common/AppointmentCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import AppointmentForm from '@/components/common/AppointmentForm';

export default function Dashboard() {
  console.log("Dashboard component initializing");
  
  const { currentUser } = useAuth();
  console.log("Current user from auth context:", currentUser);
  
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  
  // Renderizar algo mínimo em caso de erro catastrófico
  if (!currentUser) {
    console.log("No current user found in Dashboard");
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Aguarde um momento</h1>
        <p className="mt-2">Carregando suas informações...</p>
      </div>
    );
  }
  
  useEffect(() => {
    console.log("Dashboard useEffect running, currentUser:", currentUser?.name);
    
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        console.log("Fetching dashboard data...");
        // Fetch statistics
        const statsData = await api.getStats();
        console.log("Stats data received:", statsData);
        setStats(statsData);
        
        // Fetch appointments based on user role
        if (currentUser?.role === 'operator') {
          console.log("Fetching operator appointments");
          const appointments = await api.getAppointmentsByOperator(currentUser.id);
          setRecentAppointments(appointments);
        } else if (currentUser?.role === 'master') {
          console.log("Fetching pending appointments for master");
          // If master, fetch pending appointments that need assignment
          const pendingAppointments = await api.getPendingAppointments();
          setRecentAppointments(pendingAppointments.slice(0, 5)); // Show only first 5
        } else if (currentUser?.role === 'user' && currentUser?.cpf) {
          console.log("Fetching user appointments by CPF:", currentUser.cpf);
          // For regular users, fetch their appointments by CPF
          const userAppointments = await api.getAppointmentsByCPF(currentUser.cpf);
          console.log("User appointments found:", userAppointments.length);
          setRecentAppointments(userAppointments);
        }
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
  }, [currentUser, toast]);
  
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
  
  // Função para criar um novo agendamento
  const handleNewAppointment = async (data: any) => {
    try {
      await api.createAppointment(data);
      setIsNewAppointmentOpen(false);
      toast({
        title: 'Agendamento criado',
        description: 'Agendamento criado com sucesso',
      });
      
      // Recarregar os agendamentos do usuário
      if (currentUser?.cpf) {
        const userAppointments = await api.getAppointmentsByCPF(currentUser.cpf);
        setRecentAppointments(userAppointments);
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message || 'Tente novamente',
        variant: 'destructive'
      });
    }
  };
  
  // Render dashboard for regular users
  if (currentUser?.role === 'user') {
    console.log("Rendering dashboard for regular user");
    
    // Status text and color mapping
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'pending':
          return { text: 'Pendente', color: 'text-amber-600 bg-amber-50' };
        case 'waiting':
          return { text: 'Em Espera', color: 'text-blue-600 bg-blue-50' };
        case 'assigned':
          return { text: 'Atribuído', color: 'text-purple-600 bg-purple-50' };
        case 'in_service':
          return { text: 'Em Atendimento', color: 'text-indigo-600 bg-indigo-50' };
        case 'completed':
          return { text: 'Concluído', color: 'text-green-600 bg-green-50' };
        case 'cancelled':
          return { text: 'Cancelado', color: 'text-red-600 bg-red-50' };
        default:
          return { text: 'Desconhecido', color: 'text-gray-600 bg-gray-50' };
      }
    };
    
    // Format date in Brazilian format
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    return (
      <div className="p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {currentUser?.name}</h1>
            <p className="text-gray-600 mt-1">
              Este é seu painel de controle do AgendaRJ
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Button
              onClick={() => setIsNewAppointmentOpen(true)}
            >
              Novo Agendamento
            </Button>
          </div>
        </div>
        
        {/* User's appointments summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Seus Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAppointments.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentAppointments.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      location={appointment.locationId ? {
                        id: appointment.locationId,
                        name: 'Verificando...',
                        city: '',
                        state: '',
                        zipCode: '',
                        street: '',
                        number: '',
                        neighborhood: ''
                      } : null}
                      onEdit={() => window.location.href = `/appointments/details/${appointment.id}`}
                      onDelete={() => {}}
                      onRefresh={() => {}}
                    />
                  ))}
                </div>
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => window.location.href = '/appointments'}>
                    Ver Todos os Agendamentos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-primary/10 inline-flex p-4 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Você ainda não possui agendamentos registrados. Clique no botão abaixo para criar seu primeiro agendamento.
                </p>
                <Button 
                  onClick={() => setIsNewAppointmentOpen(true)}
                  className="mx-auto"
                >
                  Fazer um Agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick links for regular users */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col justify-center border-dashed"
                onClick={() => setIsNewAppointmentOpen(true)}
              >
                <Calendar className="h-6 w-6 mb-2" />
                <span>Novo Agendamento</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-24 flex flex-col justify-center border-dashed"
                onClick={() => window.location.href = '/profile'}
              >
                <User className="h-6 w-6 mb-2" />
                <span>Meu Perfil</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-24 flex flex-col justify-center border-dashed"
                onClick={() => window.location.href = '/help'}
              >
                <AlertCircle className="h-6 w-6 mb-2" />
                <span>Ajuda</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* New Appointment Dialog */}
        <Dialog 
          open={isNewAppointmentOpen} 
          onOpenChange={setIsNewAppointmentOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
            </DialogHeader>
            <AppointmentForm 
              onSubmit={handleNewAppointment}
              onCancel={() => setIsNewAppointmentOpen(false)}
              initialData={currentUser?.cpf ? { cpf: currentUser.cpf } : undefined}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {currentUser?.name}</h1>
          <p className="text-gray-600 mt-1">
            Este é seu painel de controle do AgendaRJ
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Button
            onClick={() => window.location.href = currentUser?.role === 'operator' ? '/appointments-management' : '/task-distribution'}
          >
            {currentUser?.role === 'operator' ? 'Ir para Atendimento' : 'Distribuir Tarefas'}
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Agendamentos no sistema
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <AlertCircle className="h-4 w-4 text-status-pending" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando atribuição
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-status-waiting" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Em atendimento ou atribuídos
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-status-completed" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.completed}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Atendimentos finalizados
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Message for new users */}
      {stats && stats.totalAppointments === 0 && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <div className="bg-primary/10 inline-flex p-3 rounded-full mb-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bem-vindo ao AgendaRJ!</h3>
              <p className="text-gray-600 mb-4">
                Você ainda não possui agendamentos no sistema. Comece criando seu primeiro agendamento
                ou aguarde que os usuários realizem novos agendamentos.
              </p>
              {currentUser?.role === 'master' && (
                <Button 
                  onClick={() => window.location.href = '/service-locations'}
                  className="mx-auto"
                >
                  Configurar Postos de Atendimento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent tasks for operators or pending tasks for master */}
      {recentAppointments.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {currentUser?.role === 'operator' ? 'Seus agendamentos recentes' : 'Agendamentos pendentes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                >
                  <div className="flex items-center">
                    {getStatusIcon(appointment.status)}
                    <div className="ml-3">
                      <p className="font-medium">{appointment.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(appointment.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => window.location.href = currentUser?.role === 'operator' ? '/appointments-management' : '/task-distribution'}
                  >
                    {currentUser?.role === 'operator' ? 'Atender' : 'Atribuir'}
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => window.location.href = currentUser?.role === 'operator' ? '/appointments-management' : '/task-distribution'}
              >
                Ver todos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentUser?.role === 'operator' && (
              <Button
                variant="outline"
                className="h-24 flex flex-col justify-center border-dashed"
                onClick={() => window.location.href = '/appointments-management'}
              >
                <User className="h-6 w-6 mb-2" />
                <span>Atendimentos</span>
              </Button>
            )}
            
            {currentUser?.role === 'master' && (
              <>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col justify-center border-dashed"
                  onClick={() => window.location.href = '/task-distribution'}
                >
                  <Clock className="h-6 w-6 mb-2" />
                  <span>Distribuição de Tarefas</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex flex-col justify-center border-dashed"
                  onClick={() => window.location.href = '/service-locations'}
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Postos de Atendimento</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex flex-col justify-center border-dashed"
                  onClick={() => window.location.href = '/statistics'}
                >
                  <AlertCircle className="h-6 w-6 mb-2" />
                  <span>Estatísticas</span>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-24 flex flex-col justify-center border-dashed"
                  onClick={() => window.location.href = '/users'}
                >
                  <User className="h-6 w-6 mb-2" />
                  <span>Usuários</span>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
