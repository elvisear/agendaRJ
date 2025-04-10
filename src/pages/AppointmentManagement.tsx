import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { Appointment, ServiceLocation, User, UserRole } from '@/types';
import { PlayCircle, CheckCircle, XCircle, AlertCircle, Camera, UserCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { formatCPF } from '@/utils/formatters';
import { supabaseAdmin } from '@/integrations/supabase/client';

export default function AppointmentManagement() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isTaskDistribution = location.pathname === '/task-distribution';
  const isMaster = currentUser?.role === 'master';
  
  console.log("AppointmentManagement - mounting with path:", location.pathname);
  console.log("AppointmentManagement - is task distribution:", isTaskDistribution);
  console.log("AppointmentManagement - current user:", currentUser?.name, "role:", currentUser?.role);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingStart, setConfirmingStart] = useState<string | null>(null);
  const [confirmingComplete, setConfirmingComplete] = useState<string | null>(null);
  const [confirmingAbandon, setConfirmingAbandon] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [protocol, setProtocol] = useState<string | null>(null);
  const [operators, setOperators] = useState<User[]>([]);
  const [assigningTo, setAssigningTo] = useState<{appointmentId: string, operatorId: string} | null>(null);
  
  // Função para formatar a data de criação
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Função para obter o nome do operador
  const getOperatorName = (operatorId: string | undefined) => {
    if (!operatorId) return '-';
    const operator = operators.find(op => op.id === operatorId);
    return operator ? operator.name : 'Operador não encontrado';
  };
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch locations first to ensure they're available for validation
      console.log("AppointmentManagement - fetching locations");
      const locationsData = await api.getAllServiceLocations();
      setLocations(locationsData);
      console.log("AppointmentManagement - locations loaded:", locationsData.length, locationsData);
      
      // Fetch all operators regardless of page (needed for operator name display)
      console.log("AppointmentManagement - fetching all operators");
      const operatorsData = await api.getAllUsers();
      const filteredOperators = operatorsData.filter(user => ['operator', 'master'].includes(user.role));
      setOperators(filteredOperators);
      console.log("AppointmentManagement - operators loaded:", filteredOperators.length);
      
      // Fetch appointments based on route
      if (currentUser?.id) {
        console.log("AppointmentManagement - fetching appointments for user:", currentUser.id);
        let appointmentsData: Appointment[] = [];
        
        if (isTaskDistribution) {
          // For task distribution page, get all unassigned appointments
          console.log("AppointmentManagement - fetching unassigned appointments for distribution");
          appointmentsData = await api.getUnassignedAppointments();
          console.log("AppointmentManagement - unassigned appointments raw data:", appointmentsData);
          
          // Em vez de filtrar, apenas registrar quais agendamentos têm problemas para debug
          appointmentsData.forEach(appointment => {
            const locationExists = locationsData.some(loc => loc.id === appointment.locationId);
            if (!locationExists) {
              console.warn(`Aviso: Agendamento com ID ${appointment.id} tem locationId ${appointment.locationId} que não está na lista de locais carregados`);
            }
          });
        } else if (isMaster) {
          // If user is master, get all appointments in service
          console.log("AppointmentManagement - user is master, fetching all in-service appointments");
          appointmentsData = await api.getAllInServiceAppointments();
        } else {
          // For appointment management page, get appointments assigned to this operator
          console.log("AppointmentManagement - fetching appointments for this operator");
          
          // Buscar agendamentos atribuídos ao operador
          try {
            const operatorAppointments = await api.getAppointmentsByOperator(currentUser.id);
            
            // Verificar agendamentos e registrar informações para debug
            console.log(`Encontrados ${operatorAppointments.length} agendamentos atribuídos ao operador ${currentUser.id}`);
            
            if (operatorAppointments.length === 0) {
              // Se não houver agendamentos, verificar o banco diretamente para debug
              console.log("Verificando agendamentos no banco para este operador");
              const { data, error } = await supabaseAdmin
                .from('appointments')
                .select('*')
                .eq('operatorId', currentUser.id);
                
              if (error) {
                console.error("Erro ao verificar agendamentos no banco:", error);
              } else {
                console.log(`Consulta direta ao banco: ${data?.length || 0} agendamentos encontrados para o operador ${currentUser.id}`);
                if (data && data.length > 0) {
                  console.log("Primeiros agendamentos encontrados:", data.slice(0, 3));
                }
              }
            }
            
            appointmentsData = operatorAppointments;
          } catch (error) {
            console.error("Erro ao buscar agendamentos do operador:", error);
            appointmentsData = [];
          }
        }
        
        console.log("AppointmentManagement - appointments loaded:", appointmentsData.length);
        
        // Garantir que os agendamentos tenham o status correto
        if (!isTaskDistribution && !isMaster) {
          // Registrar status de cada agendamento para debug
          const statusCount: Record<string, number> = {};
          appointmentsData.forEach(app => {
            statusCount[app.status] = (statusCount[app.status] || 0) + 1;
          });
          console.log("Distribuição de status dos agendamentos:", statusCount);
        }
        
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [currentUser?.id, isTaskDistribution]);
  
  // Função para obter o nome da cidade do local de atendimento
  const getLocationName = (locationId: string) => {
    if (!locationId) {
      console.warn("Location ID indefinido");
      return 'Local não especificado';
    }
    
    // Busca exata pelo ID
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      return location.city || 'Cidade não especificada';
    }
    
    // Tentativas de encontrar correspondências alternativas
    
    // 1. Correspondência parcial pelo início do UUID
    const partialMatch = locations.find(loc => 
      locationId.startsWith(loc.id.substring(0, 8)) || 
      loc.id.startsWith(locationId.substring(0, 8))
    );
    
    if (partialMatch) {
      return partialMatch.city;
    }
    
    // 2. Para IDs numéricos, busca pelo final do UUID
    if (/^\d+$/.test(locationId)) {
      const numericMatch = locations.find(loc => {
        const locNumericPart = loc.id.replace(/^.*-/, '').replace(/^0+/, '');
        return locNumericPart === locationId.replace(/^0+/, '');
      });
      
      if (numericMatch) {
        return numericMatch.city;
      }
    }
    
    // Se não conseguir encontrar, retorne um valor padrão
    return 'Local não identificado';
  };

  // Função para deletar um agendamento
  const handleDeleteAppointment = async (appointmentId: string) => {
    setLoading(true);
    try {
      console.log(`Excluindo agendamento ${appointmentId}`);
      await api.deleteAppointment(appointmentId);
      
      // Remover o agendamento da lista
      setAppointments(prev => prev.filter(app => app.id !== appointmentId));
      
      toast.success('Agendamento excluído com sucesso');
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast.error('Erro ao excluir agendamento');
    } finally {
      setLoading(false);
      setConfirmingDelete(null);
    }
  };
  
  const handleStartService = async (appointmentId: string) => {
    setLoading(true);
    try {
      const updated = await api.startService(appointmentId);
      
      // Update appointments list
      setAppointments(prev => 
        prev.map(app => app.id === appointmentId ? updated : app)
      );
      
      toast.success('Atendimento iniciado com sucesso');
    } catch (error) {
      console.error('Error starting service:', error);
      toast.error('Erro ao iniciar atendimento');
    } finally {
      setLoading(false);
      setConfirmingStart(null);
    }
  };
  
  const handleCompleteService = async (appointmentId: string) => {
    if (!protocol) {
      toast.error('É necessário anexar um protocolo');
      return;
    }
    
    setLoading(true);
    try {
      const updated = await api.completeService(appointmentId, protocol);
      
      // Update appointments list
      setAppointments(prev => 
        prev.filter(app => app.id !== appointmentId)
      );
      
      toast.success('Atendimento finalizado com sucesso');
      setProtocol(null);
    } catch (error) {
      console.error('Error completing service:', error);
      toast.error('Erro ao finalizar atendimento');
    } finally {
      setLoading(false);
      setConfirmingComplete(null);
    }
  };
  
  const handleAbandonService = async (appointmentId: string) => {
    if (!abandonReason) {
      toast.error('É necessário informar o motivo');
      return;
    }
    
    setLoading(true);
    try {
      await api.abandonService(appointmentId, abandonReason);
      
      // Update appointments list
      setAppointments(prev => 
        prev.filter(app => app.id !== appointmentId)
      );
      
      toast.success('Atendimento devolvido com sucesso');
      setAbandonReason('');
    } catch (error) {
      console.error('Error abandoning service:', error);
      toast.error('Erro ao devolver atendimento');
    } finally {
      setLoading(false);
      setConfirmingAbandon(null);
    }
  };
  
  const handleProtocolUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProtocol(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const captureFromCamera = async () => {
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create video and canvas elements
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      // Set up video
      video.srcObject = stream;
      video.play();
      
      // Wait for video to be ready
      video.onloadedmetadata = () => {
        // Set canvas size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Capture frame
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        // Get data URL
        const imageData = canvas.toDataURL('image/png');
        setProtocol(imageData);
        
        // Stop camera
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Erro ao acessar a câmera');
    }
  };
  
  const pasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              setProtocol(reader.result as string);
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      toast.error('Nenhuma imagem encontrada na área de transferência');
    } catch (error) {
      console.error('Error accessing clipboard:', error);
      toast.error('Erro ao acessar a área de transferência');
    }
  };
  
  // Handle assigning operator to an appointment
  const handleAssignOperator = async () => {
    if (!assigningTo) return;
    
    setLoading(true);
    try {
      const { appointmentId, operatorId } = assigningTo;
      console.log("Atribuindo operador:", operatorId, "ao agendamento:", appointmentId);
      
      const updated = await api.assignOperator(appointmentId, operatorId);
      
      // Update appointments list - remove the assigned appointment
      setAppointments(prev => 
        prev.filter(app => app.id !== appointmentId)
      );
      
      toast.success('Agendamento atribuído com sucesso');
    } catch (error) {
      console.error('Error assigning operator:', error);
      toast.error('Erro ao atribuir operador');
    } finally {
      setLoading(false);
      setAssigningTo(null);
    }
  };
  
  if (loading && appointments.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isTaskDistribution ? 'Distribuição de Tarefas' : 'Atendimentos'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isTaskDistribution 
            ? 'Distribua os agendamentos para os operadores disponíveis'
            : 'Gerencie os agendamentos atribuídos a você'}
        </p>
      </div>
      
      {loading ? (
        <div className="p-8 flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando agendamentos...</p>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {isTaskDistribution 
              ? 'Nenhum agendamento pendente'
              : 'Nenhum agendamento'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isTaskDistribution 
              ? 'Não há agendamentos pendentes para distribuir no momento.'
              : 'Você não possui agendamentos atribuídos no momento.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {!isTaskDistribution && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posição
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CPF
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {(!isTaskDistribution && isMaster) && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operador
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    {!isTaskDistribution && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.queuePosition || '-'}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatCPF(appointment.cpf)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {getLocationName(appointment.locationId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        appointment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                        appointment.status === 'in_service' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'pending' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status === 'assigned' ? 'Atribuído' :
                         appointment.status === 'waiting' ? 'Em espera' :
                         appointment.status === 'in_service' ? 'Em atendimento' :
                         appointment.status === 'pending' ? 'Pendente' :
                         appointment.status}
                      </span>
                    </td>
                    {(!isTaskDistribution && isMaster) && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {getOperatorName(appointment.operatorId)}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500" title={appointment.createdAt}>
                        {formatDate(appointment.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {isTaskDistribution ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setAssigningTo({ appointmentId: appointment.id, operatorId: '' })}
                              disabled={loading}
                              title="Atribuir a um operador"
                            >
                              <UserCheck className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:inline">Atribuir</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setConfirmingDelete(appointment.id)}
                              disabled={loading}
                              title="Excluir agendamento"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:inline">Excluir</span>
                            </Button>
                          </>
                        ) : (
                          <>
                            {appointment.status !== 'in_service' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => setConfirmingStart(appointment.id)}
                                disabled={loading}
                                title="Iniciar atendimento"
                              >
                                <PlayCircle className="h-4 w-4" />
                                <span className="sr-only md:not-sr-only md:inline">Iniciar</span>
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setConfirmingComplete(appointment.id)}
                              disabled={loading || appointment.status !== 'in_service'}
                              title={appointment.status !== 'in_service' ? "Atendimento precisa ser iniciado primeiro" : "Finalizar atendimento"}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:inline">Finalizar</span>
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setConfirmingAbandon(appointment.id)}
                              disabled={loading}
                              title="Desistir do atendimento"
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only md:not-sr-only md:inline">Desistir</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Start Service Dialog */}
      <Dialog open={!!confirmingStart} onOpenChange={() => setConfirmingStart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Atendimento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja iniciar este atendimento? O status será alterado para "Em atendimento".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingStart(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={() => confirmingStart && handleStartService(confirmingStart)} disabled={loading}>
              {loading ? 'Processando...' : 'Iniciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Complete Service Dialog */}
      <Dialog open={!!confirmingComplete} onOpenChange={() => {
        setConfirmingComplete(null);
        setProtocol(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar Atendimento</DialogTitle>
            <DialogDescription>
              Anexe o protocolo para finalizar o atendimento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {protocol ? (
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium">Protocolo anexado:</p>
                <div className="border rounded-md overflow-hidden">
                  <img src={protocol} alt="Protocolo" className="max-w-full h-auto" />
                </div>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setProtocol(null)}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Escolha como anexar o protocolo:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button variant="outline" onClick={captureFromCamera}>
                    <Camera className="mr-1 h-4 w-4" /> Câmera
                  </Button>
                  
                  <Button variant="outline" onClick={pasteFromClipboard}>
                    Colar da área de transferência
                  </Button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="protocol-upload"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleProtocolUpload}
                    />
                    <Button variant="outline" className="w-full">
                      Carregar arquivo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmingComplete(null);
              setProtocol(null);
            }} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={() => confirmingComplete && handleCompleteService(confirmingComplete)} 
              disabled={loading || !protocol}
            >
              {loading ? 'Processando...' : 'Finalizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Abandon Service Dialog */}
      <Dialog open={!!confirmingAbandon} onOpenChange={() => {
        setConfirmingAbandon(null);
        setAbandonReason('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desistir do Atendimento</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo para desistir deste atendimento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo:</label>
              <Input
                value={abandonReason}
                onChange={(e) => setAbandonReason(e.target.value)}
                placeholder="Explique o motivo para desistir do atendimento"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setConfirmingAbandon(null);
              setAbandonReason('');
            }} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => confirmingAbandon && handleAbandonService(confirmingAbandon)} 
              disabled={loading || !abandonReason}
            >
              {loading ? 'Processando...' : 'Desistir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign Operator Dialog */}
      <Dialog open={!!assigningTo} onOpenChange={() => setAssigningTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Operador</DialogTitle>
            <DialogDescription>
              Selecione um operador para atribuir a este agendamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Operador:</label>
              <select 
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={assigningTo?.operatorId || ''}
                onChange={(e) => setAssigningTo(prev => prev ? { ...prev, operatorId: e.target.value } : null)}
              >
                <option value="" disabled>Selecione um operador</option>
                {operators.map(operator => (
                  <option key={operator.id} value={operator.id}>
                    {operator.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningTo(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignOperator} 
              disabled={loading || !assigningTo?.operatorId}
            >
              {loading ? 'Processando...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Appointment Dialog */}
      <Dialog open={!!confirmingDelete} onOpenChange={() => setConfirmingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Agendamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => confirmingDelete && handleDeleteAppointment(confirmingDelete)} 
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
