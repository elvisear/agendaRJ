import React, { useState, useEffect } from 'react';
import { Edit, Trash, MapPin, Calendar, Phone, User, Clock, AlertCircle, MoreVertical, RefreshCw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment, ServiceLocation } from '@/types';
import { getStatusLabel, formatCPF, formatDate, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/services/api';
import { toast } from '@/components/ui/sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppointmentCardProps {
  appointment: Appointment;
  location?: ServiceLocation;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
  onProtocol?: (id: string) => void;
  onComplete?: (id: string) => void;
  showActions?: boolean;
}

export default function AppointmentCard({
  appointment,
  location: propLocation,
  onEdit,
  onDelete,
  onRefresh,
  onProtocol,
  onComplete,
  showActions = true,
}: AppointmentCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState<ServiceLocation | null>(propLocation || null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Se o location já foi fornecido nas props, não precisa buscar
        if (propLocation) {
          console.log("AppointmentCard - Location já fornecido via props:", propLocation.name);
          setLocation(propLocation);
          return;
        }
        
        // Se não temos locationId, não podemos buscar
        if (!appointment.locationId) {
          console.warn("AppointmentCard - Agendamento sem locationId:", appointment.id);
          return;
        }
        
        // Verificar se o locationId é um UUID válido
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(appointment.locationId)) {
          console.warn(`AppointmentCard - LocationId não é um UUID válido: ${appointment.locationId}`);
        }
        
        setLocationLoading(true);
        const locationData = await api.getServiceLocation(appointment.locationId);
        if (locationData) {
          console.log("AppointmentCard - Location encontrado:", locationData);
          setLocation(locationData);
        } else {
          console.log("AppointmentCard - Location não encontrado para o ID:", appointment.locationId);
        }
      } catch (error) {
        console.error("Erro ao buscar localização:", error);
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, [appointment.locationId, propLocation]);

  const statusLabel = getStatusLabel(appointment.status);
  
  // Aplicar cores com base no status
  const getStatusColors = () => {
    switch (appointment.status) {
      case 'pending':
        return 'border-l-4 border-l-orange-500 bg-orange-50';
      case 'waiting':
      case 'in_service':
      case 'assigned':
        return 'border-l-4 border-l-blue-500 bg-blue-50';
      case 'completed':
        return 'border-l-4 border-l-green-500 bg-green-50';
      case 'cancelled':
        return 'border-l-4 border-l-red-500 bg-red-50';
      default:
        return 'border-l-4 border-l-gray-500 bg-gray-50';
    }
  };
  
  // Cor do badge de status
  const getStatusBadgeColor = () => {
    switch (appointment.status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'waiting':
      case 'in_service':
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleLeaveLine = async () => {
    try {
      await api.updateAppointment(appointment.id, {
        status: 'cancelled'
      });
      toast.success('Agendamento cancelado com sucesso');
      setIsDetailsOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Erro ao cancelar agendamento');
    }
  };
  
  const handleDelete = async () => {
    try {
      await api.deleteAppointment(appointment.id);
      toast.success('Agendamento excluído com sucesso');
      setIsConfirmingDelete(false);
      onRefresh();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao excluir agendamento');
    }
  };
  
  const handleReactivate = async () => {
    try {
      await api.reactivateAppointment(appointment.id);
      toast.success('Agendamento reativado com sucesso');
      setIsDetailsOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error reactivating appointment:', error);
      toast.error('Erro ao reativar agendamento');
    }
  };

  const renderStatusMessage = () => {
    switch (appointment.status) {
      case 'pending':
        return (
          <div className="text-center mb-4">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <p className="text-gray-700">
              Seu agendamento ainda não foi atribuído para um colaborador, mas fique tranquilo, pois já estamos trabalhando nisso.
            </p>
          </div>
        );
      case 'waiting':
      case 'in_service':
      case 'assigned':
        return (
          <div className="text-center mb-4">
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <p className="text-gray-700">
              Olá, {appointment.name}! Você está na fila para agendamento da cidade {location?.city || ''}, aguarde sua vez. 
              {appointment.queuePosition && <span className="font-medium"> Você é o {appointment.queuePosition}º na fila</span>}
            </p>
          </div>
        );
      case 'completed':
        return (
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto mb-4 text-green-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-gray-700 mb-4">
              Olá, {appointment.name}! Seu agendamento foi efetuado e o seu protocolo é:
            </p>
            {appointment.protocol && (
              <div className="border rounded-md p-2 mb-4">
                <img src={appointment.protocol} alt="Protocolo" className="max-w-full h-auto" />
              </div>
            )}
          </div>
        );
      case 'cancelled':
        return (
          <div className="text-center mb-4">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-gray-700 mb-4">
              Olá, {appointment.name}! Seu agendamento foi cancelado.
            </p>
            <div className="flex flex-col gap-2 items-center">
              
              <Button onClick={() => {
                setIsDetailsOpen(false);
                window.location.href = '/appointments';
              }}>
                Criar Novo Agendamento
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Função para renderizar o local do agendamento
  const renderLocation = () => {
    if (location) {
      // Exibir informações completas de localização quando disponíveis
      return (
        <span>
          {location.name}
          {location.street && (
            <span className="location-address"> - {location.street}, {location.number}, {location.neighborhood}</span>
          )}
        </span>
      );
    } else if (appointment.locationId) {
      // Caso tenhamos locationId mas não encontramos o local
      return (
        <span className="flex items-center">
          Local ID: {appointment.locationId.substring(0, 8)}...
          <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" /> Carregando...
          </span>
        </span>
      );
    } else {
      // Caso não tenha localização definida
      return <span className="text-red-500">Não especificado</span>;
    }
  };

  return (
    <>
      <div 
        className={cn(
          "rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-all",
          getStatusColors()
        )}
      >
        <div className="p-3" onClick={() => setIsDetailsOpen(true)}>
          <div className="flex justify-between items-start mb-2">
            <span className={cn(
              "inline-block px-2 py-0.5 text-xs font-medium rounded-full",
              getStatusBadgeColor()
            )}>
              {statusLabel}
            </span>
            {showActions && appointment.status !== 'completed' && (
              <div className="flex space-x-1">
                <button 
                  className="text-gray-500 hover:text-primary p-1 rounded-full hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(appointment.id);
                  }}
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button 
                  className="text-gray-500 hover:text-red-500 p-1 rounded-full hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingDelete(true);
                  }}
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          <h3 className="font-medium text-gray-900 text-base mb-1 flex items-center">
            <User className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            {appointment.name}
          </h3>
          
          <p className="text-xs text-gray-500 mb-1.5 flex items-center">
            <span className="inline-block w-3.5 h-3.5 mr-1.5 opacity-70">🪪</span>
            CPF: {formatCPF(appointment.cpf)}
          </p>
          
          {/* Informações de localização destacadas */}
          <div className="mt-2 p-1.5 bg-white rounded-md border border-gray-100">
            <p className="text-xs text-gray-700 flex items-center font-medium">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-500 flex-shrink-0" />
              {renderLocation()}
            </p>
            {location && (
              <p className="text-xs text-gray-500 ml-5">
                {location.city}, {location.state}
              </p>
            )}
          </div>
          
          {appointment.queuePosition && (
            <p className="mt-1.5 text-xs font-medium flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Posição na fila: {appointment.queuePosition}
            </p>
          )}
          
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            <Calendar className="w-3 h-3 mr-1.5" />
            Agendado em: {formatDate(appointment.createdAt)}
          </p>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              Informações sobre seu agendamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {renderStatusMessage()}
            
            {location && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="font-medium mb-2 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> Local do Agendamento
                </h4>
                <p className="text-sm mb-1">{renderLocation()}</p>
                <p className="text-sm text-gray-500">
                  {location.street}, {location.number} 
                  {location.complement && ` - ${location.complement}`}<br />
                  {location.neighborhood}, {location.city} - {location.state}<br />
                  CEP: {location.zipCode}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            {['pending', 'waiting', 'assigned', 'in_service'].includes(appointment.status) && (
              <Button variant="destructive" onClick={handleLeaveLine}>
                Sair da fila de agendamento
              </Button>
            )}
            {appointment.status === 'cancelled' && (
              <Button variant="default" onClick={handleReactivate} className="bg-green-600 hover:bg-green-700">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                  </svg>
                  Reativar
                </span>
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmingDelete(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={appointment.status === 'completed'}
            >
              {appointment.status === 'completed' ? 'Não permitido' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
