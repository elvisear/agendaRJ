import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Clock, ChevronLeft, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import AppointmentCard from '@/components/common/AppointmentCard';
import AppointmentForm from '@/components/common/AppointmentForm';
import { Appointment, ServiceLocation, AppointmentStatus } from '@/types';
import { api } from '@/services/api';
import { formatCPF } from '@/utils/formatters';

export default function Appointments() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<AppointmentStatus | 'all'>('all');
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);
  const [isEditAppointmentOpen, setIsEditAppointmentOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Fetch locations on component mount
    const fetchLocations = async () => {
      try {
        const locationsData = await api.getAllServiceLocations();
        setLocations(locationsData);
      } catch (error) {
        console.error('Error fetching locations:', error);
        toast.error('Erro ao carregar postos de atendimento');
      }
    };
    
    fetchLocations();
  }, []);
  
  useEffect(() => {
    // Apply filtering
    if (filter === 'all') {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(appointments.filter(appointment => appointment.status === filter));
    }
  }, [appointments, filter]);
  
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedCpf = formatCPF(e.target.value);
    setCpf(formattedCpf);
  };
  
  const handleSearch = async () => {
    if (!cpf || cpf.replace(/\D/g, '').length < 11) {
      toast.error('Por favor, digite um CPF válido');
      return;
    }
    
    setLoading(true);
    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      const appointmentsData = await api.getAppointmentsByCPF(cleanCpf);
      setAppointments(appointmentsData);
      setFilteredAppointments(appointmentsData);
      
      if (appointmentsData.length === 0) {
        toast.info('Nenhum agendamento encontrado para este CPF');
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao buscar agendamentos');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewAppointment = async (data: any) => {
    try {
      await api.createAppointment(data);
      setIsNewAppointmentOpen(false);
      toast.success('Agendamento criado com sucesso');
      
      if (cpf) {
        // Refresh appointments list
        const cleanCpf = cpf.replace(/\D/g, '');
        const appointmentsData = await api.getAppointmentsByCPF(cleanCpf);
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
      }
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(`Erro ao criar agendamento: ${error.message || 'Tente novamente'}`);
    }
  };
  
  const handleEditAppointment = async (data: any) => {
    if (!currentAppointment) return;
    
    try {
      await api.updateAppointment(currentAppointment.id, data);
      setIsEditAppointmentOpen(false);
      toast.success('Agendamento atualizado com sucesso');
      
      if (cpf) {
        // Refresh appointments list
        const cleanCpf = cpf.replace(/\D/g, '');
        const appointmentsData = await api.getAppointmentsByCPF(cleanCpf);
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    } finally {
      setCurrentAppointment(null);
    }
  };
  
  const handleDeleteAppointment = async (id: string) => {
    try {
      await api.deleteAppointment(id);
      
      // Update local state
      const updatedAppointments = appointments.filter(app => app.id !== id);
      setAppointments(updatedAppointments);
      setFilteredAppointments(updatedAppointments.filter(app => 
        filter === 'all' ? true : app.status === filter
      ));
      
      toast.success('Agendamento excluído com sucesso');
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir agendamento');
    }
  };
  
  const refreshAppointments = async () => {
    if (!cpf) return;
    
    setLoading(true);
    try {
      // Garantir que temos os locations antes de buscar os agendamentos
      if (locations.length === 0) {
        const locationsData = await api.getAllServiceLocations();
        setLocations(locationsData);
      }
      
      // Buscar agendamentos
      const cleanCpf = cpf.replace(/\D/g, '');
      const appointmentsData = await api.getAppointmentsByCPF(cleanCpf);
      
      // Imprimir os IDs dos locationIds dos agendamentos e locations carregados
      console.log("Locations disponíveis:", locations.map(loc => ({ id: loc.id, name: loc.name })));
      console.log("Agendamentos carregados:", appointmentsData.map(app => ({ 
        id: app.id, 
        name: app.name, 
        locationId: app.locationId 
      })));
      
      setAppointments(appointmentsData);
      setFilteredAppointments(appointmentsData);
    } catch (error) {
      console.error('Error refreshing appointments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const openEditDialog = (id: string) => {
    const appointment = appointments.find(app => app.id === id);
    if (appointment) {
      setCurrentAppointment(appointment);
      setIsEditAppointmentOpen(true);
    }
  };
  
  // Get location details for a specific appointment
  const getLocationForAppointment = async (appointment: Appointment): Promise<ServiceLocation | null> => {
    try {
      console.log("Appointments - Buscando local para appointment:", appointment.id, "com locationId:", appointment.locationId);
      
      // Buscar diretamente do banco via API
      const location = await api.getServiceLocation(appointment.locationId);
      
      if (location) {
        console.log("Appointments - Local encontrado no banco:", location.name);
        return location;
      }
      
      console.log("Appointments - Local não encontrado no banco. Tentando alternativas.");
      
      // Se não encontrou, tentar buscar todos e encontrar uma correspondência
      const allLocations = await api.getAllServiceLocations();
      console.log("Appointments - Todos os locais do banco:", allLocations.map(l => l.id));
      
      // Verificar correspondência pelo ID numérico
      if (appointment.locationId) {
        const matches = appointment.locationId.match(/([0-9]+)$/);
        if (matches && matches[1]) {
          const numericId = matches[1].replace(/^0+/, ''); // Remover zeros à esquerda
          console.log("Appointments - Extraindo ID numérico:", numericId);
          
          const matchingLocation = allLocations.find(loc => {
            const locNumericId = loc.id.replace(/^.*-/, '').replace(/^0+/, '');
            return locNumericId === numericId;
          });
          
          if (matchingLocation) {
            console.log("Appointments - Local encontrado com ID numérico:", matchingLocation.name);
            return matchingLocation;
          }
        }
      }
      
      console.log("Appointments - Nenhum local encontrado para locationId:", appointment.locationId);
      return null;
    } catch (error) {
      console.error("Erro ao buscar local para agendamento:", error);
      return null;
    }
  };
  
  // Carregar os locais de agendamento quando necessário
  useEffect(() => {
    if (appointments.length > 0) {
      const loadMissingLocations = async () => {
        const missingLocationIds = appointments
          .filter(app => !locations.some(loc => loc.id === app.locationId))
          .map(app => app.locationId);
        
        if (missingLocationIds.length === 0) return;
        
        console.log("Buscando locais em falta:", missingLocationIds);
        
        try {
          // Buscar todos os locais novamente para garantir que temos dados atualizados
          const locationsData = await api.getAllServiceLocations();
          setLocations(locationsData);
        } catch (error) {
          console.error("Erro ao buscar locais:", error);
        }
      };
      
      loadMissingLocations();
    }
  }, [appointments, locations]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header minimalista para dispositivos móveis */}
      <header className="bg-primary shadow-sm py-2">
        <div className="container mx-auto px-3 flex items-center justify-between">
          <button 
            className="flex items-center text-white hover:text-gray-200"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm ml-1">Voltar</span>
          </button>
          
          <div className="flex items-center">
            <Calendar className="text-white h-4 w-4 mr-1" />
            <h1 className="text-white text-base font-medium">Agendamentos</h1>
          </div>
          
          <Button 
            onClick={() => setIsNewAppointmentOpen(true)}
            className="bg-white text-primary hover:bg-gray-100 h-7 px-2"
            size="sm"
          >
            <span className="text-xs">Novo</span>
          </Button>
        </div>
      </header>
      
      {/* Main content com padding reduzido */}
      <main className="px-3 py-3">
        {/* Search section simplificada */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
          <h2 className="text-sm font-medium mb-2">Buscar agendamentos</h2>
          
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                CPF
              </label>
              <div className="relative">
                <Input
                  placeholder="Digite seu CPF"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="pl-8 h-8 text-sm"
                />
                <Search className="h-3.5 w-3.5 text-gray-500 absolute left-2.5 top-2" />
              </div>
            </div>
            
            <Button 
              onClick={handleSearch}
              className="w-full h-8"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>
        
        {/* Results section */}
        {appointments.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium">
                Seus agendamentos ({appointments.length})
              </h2>
              
              <div className="flex items-center">
                <Filter className="h-3.5 w-3.5 text-gray-500 mr-1" />
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value as AppointmentStatus | 'all')}
                >
                  <SelectTrigger className="h-8 text-xs px-2.5 min-w-[120px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Em atribuição</SelectItem>
                    <SelectItem value="waiting">Em Atendimento</SelectItem>
                    <SelectItem value="in_service">Em Serviço</SelectItem>
                    <SelectItem value="assigned">Atribuído</SelectItem>
                    <SelectItem value="completed">Realizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {filteredAppointments.map((appointment) => (
                <AppointmentCard 
                  key={appointment.id}
                  appointment={appointment}
                  location={null}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteAppointment}
                  onRefresh={refreshAppointments}
                />
              ))}
            </div>
          </div>
        )}
        
        {appointments.length === 0 && cpf && !loading && (
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Clock className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">Nenhum agendamento encontrado</p>
            <p className="text-xs text-gray-500 mb-3">Crie um novo agendamento para começar</p>
            <Button 
              onClick={() => setIsNewAppointmentOpen(true)}
              size="sm"
              className="h-8"
            >
              Criar Agendamento
            </Button>
          </div>
        )}
        
        {!cpf && (
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <Search className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">Digite seu CPF para ver seus agendamentos</p>
            <p className="text-xs text-gray-500 mb-3">Ou crie um novo agendamento agora</p>
            <Button 
              onClick={() => setIsNewAppointmentOpen(true)}
              size="sm"
              className="h-8"
            >
              Criar Agendamento
            </Button>
          </div>
        )}
      </main>
      
      {/* New Appointment Dialog */}
      <Dialog 
        open={isNewAppointmentOpen} 
        onOpenChange={setIsNewAppointmentOpen}
      >
        <DialogContent className="w-[95vw] max-w-[450px] p-4 rounded-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <AppointmentForm 
            onSubmit={handleNewAppointment}
            onCancel={() => setIsNewAppointmentOpen(false)}
            initialData={cpf ? { cpf } : undefined}
          />
        </DialogContent>
      </Dialog>
      
      {/* Edit Appointment Dialog */}
      <Dialog 
        open={isEditAppointmentOpen} 
        onOpenChange={setIsEditAppointmentOpen}
      >
        <DialogContent className="w-[95vw] max-w-[450px] p-4 rounded-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Editar Agendamento</DialogTitle>
          </DialogHeader>
          {currentAppointment && (
            <AppointmentForm 
              onSubmit={handleEditAppointment}
              onCancel={() => setIsEditAppointmentOpen(false)}
              initialData={currentAppointment}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
