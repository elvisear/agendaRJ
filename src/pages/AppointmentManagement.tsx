
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Appointment, ServiceLocation } from '@/types';
import { PlayCircle, CheckCircle, XCircle, AlertCircle, Camera } from 'lucide-react';
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

export default function AppointmentManagement() {
  const { currentUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingStart, setConfirmingStart] = useState<string | null>(null);
  const [confirmingComplete, setConfirmingComplete] = useState<string | null>(null);
  const [confirmingAbandon, setConfirmingAbandon] = useState<string | null>(null);
  const [abandonReason, setAbandonReason] = useState('');
  const [protocol, setProtocol] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch locations
        const locationsData = await api.getServiceLocations();
        setLocations(locationsData);
        
        // Fetch appointments assigned to this operator
        if (currentUser?.id) {
          const appointmentsData = await api.getAppointmentsByOperator(currentUser.id);
          setAppointments(appointmentsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentUser?.id]);
  
  const getLocationName = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    return location ? location.city : 'Local não encontrado';
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
        <h1 className="text-3xl font-bold text-gray-900">Atendimentos</h1>
        <p className="text-gray-600 mt-1">
          Gerencie os agendamentos atribuídos a você
        </p>
      </div>
      
      {appointments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhum agendamento</h2>
          <p className="text-gray-600 mb-6">
            Você não possui agendamentos atribuídos no momento.
          </p>
          <Button onClick={() => window.location.reload()}>
            Atualizar
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posição
                  </th>
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.queuePosition || '-'}
                      </div>
                    </td>
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
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status === 'assigned' ? 'Atribuído' :
                         appointment.status === 'waiting' ? 'Em espera' :
                         appointment.status === 'in_service' ? 'Em atendimento' :
                         appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
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
                          disabled={loading}
                          title="Finalizar atendimento"
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
    </div>
  );
}
