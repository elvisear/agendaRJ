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
      {/* Header com botão de voltar - versão mobile otimizada */}
      <header className="bg-primary shadow-md py-3">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex w-full sm:w-auto justify-between items-center">
            <button 
              className="flex items-center text-white hover:text-gray-200"
              onClick={() => navigate('/')}
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span>Voltar</span>
            </button>
            <div className="flex items-center sm:hidden">
              <Calendar className="text-white h-5 w-5 mr-2" />
              <h1 className="text-white text-lg font-bold">Agendamentos</h1>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center">
            <Calendar className="text-white h-6 w-6 mr-2" />
            <h1 className="text-white text-2xl font-bold">Agendamentos</h1>
          </div>
          
          <Button 
            onClick={() => setIsNewAppointmentOpen(true)}
            className="w-full sm:w-auto bg-white text-primary hover:bg-gray-100"
            size="sm"
          >
            Novo Agendamento
          </Button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Search section */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Buscar agendamentos</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF
              </label>
              <div className="relative">
                <Input
                  placeholder="Digite seu CPF"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="pl-10"
                />
                <Search className="h-4 w-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>
            
            <div className="sm:self-end">
              <Button 
                onClick={handleSearch}
                className="w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Results section */}
        {appointments.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">
                Seus agendamentos ({appointments.length})
              </h2>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select
                  value={filter}
                  onValueChange={(value) => setFilter(value as AppointmentStatus | 'all')}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Em atribuição</SelectItem>
                    <SelectItem value="waiting">Em Atendimento</SelectItem>
                    <SelectItem value="in_service">Em Serviço</SelectItem>
                    <SelectItem value="assigned">Atribuído</SelectItem>
                    <SelectItem value="completed">Atendimento Realizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 px-0 sm:px-6">
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
          <div className="text-center p-4 sm:p-8 bg-white rounded-lg shadow">
            <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-lg sm:text-xl font-medium text-gray-600">Nenhum agendamento encontrado</p>
            <p className="text-gray-500 mb-4">Crie um novo agendamento para começar</p>
            <Button onClick={() => setIsNewAppointmentOpen(true)}>
              Criar Agendamento
            </Button>
          </div>
        )}
        
        {!cpf && (
          <div className="text-center p-4 sm:p-8 bg-white rounded-lg shadow">
            <Search className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-lg sm:text-xl font-medium text-gray-600">Digite seu CPF para ver seus agendamentos</p>
            <p className="text-gray-500 mb-4">Ou crie um novo agendamento agora</p>
            <Button onClick={() => setIsNewAppointmentOpen(true)}>
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
        <DialogContent className="w-[95vw] max-w-[500px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
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
        <DialogContent className="w-[95vw] max-w-[500px] rounded-lg">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
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
