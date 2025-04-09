
import { useEffect, useState } from 'react';
import { User, Calendar, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Appointment } from '@/types';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch statistics
        const statsData = await api.getStats();
        setStats(statsData);
        
        // Fetch recent appointments if user is an operator
        if (currentUser?.role === 'operator') {
          const appointments = await api.getAppointmentsByOperator(currentUser.id);
          setRecentAppointments(appointments);
        } else if (currentUser?.role === 'master') {
          // If master, fetch pending appointments that need assignment
          const pendingAppointments = await api.getPendingAppointments();
          setRecentAppointments(pendingAppointments.slice(0, 5)); // Show only first 5
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os dados do dashboard',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentUser, toast]);
  
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
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
