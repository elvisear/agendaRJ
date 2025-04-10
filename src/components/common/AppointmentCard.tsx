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
          "rounded-lg shadow-sm mb-3",
          getStatusColors()
        )}
      >
        <div className="p-4">
          {/* Status badge no topo */}
          <div className="flex flex-col sm:flex-row justify-between mb-3">
            <span className={cn(
              "text-xs font-medium px-2.5 py-0.5 rounded-full w-fit mb-2 sm:mb-0",
              getStatusBadgeColor()
            )}>
              {statusLabel}
            </span>

            {/* Dropdown de ações em dispositivos móveis */}
            {showActions && (
              <div className="flex space-x-1 justify-end">
                {appointment.status === 'cancelled' && onRefresh && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleReactivate}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                
                {onProtocol && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onProtocol(appointment.id)}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                )}
                
                {onComplete && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onComplete(appointment.id)}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                )}
                
                {onEdit && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(appointment.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                {onDelete && appointment.status !== 'completed' && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Nome e detalhes principais */}
          <div className="mb-3">
            <h3 className="text-base font-medium truncate">
              {appointment.name}
            </h3>
            <div className="text-sm text-gray-600 mt-0.5">
              CPF: {formatCPF(appointment.cpf)}
            </div>
          </div>

          {/* Informações do agendamento */}
          <div className="space-y-2">
            <div className="flex items-start">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-sm">{renderLocation()}</span>
            </div>
            
            <div className="flex items-start">
              <Calendar className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm">{formatDateTime(appointment.scheduledAt)}</div>
            </div>
            
            {appointment.whatsapp && (
              <div className="flex items-start">
                <Phone className="h-4 w-4 text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm">{appointment.whatsapp}</div>
              </div>
            )}
          </div>

          {/* Botão de detalhes no rodapé */}
          <div className="mt-4 flex justify-center">
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full text-sm py-1 h-8"
              onClick={() => setIsDetailsOpen(true)}
            >
              Ver Detalhes
            </Button>
          </div>
        </div>
      </div>

      {/* Dialog de detalhes do agendamento */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          
          {renderStatusMessage()}
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium">{appointment.name}</div>
                  <div className="text-sm text-gray-600">CPF: {formatCPF(appointment.cpf)}</div>
                </div>
              </div>
              
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <div className="font-medium">Data e Hora</div>
                  <div className="text-sm text-gray-600">{formatDateTime(appointment.scheduledAt)}</div>
                </div>
              </div>
              
              {location && (
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Local</div>
                    <div className="text-sm text-gray-600">
                      {location.name}
                      {location.street && (
                        <div className="mt-1">
                          {location.street}, {location.number}
                          <br />
                          {location.neighborhood}, {location.city} - {location.state}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {appointment.whatsapp && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Contato</div>
                    <div className="text-sm text-gray-600">{appointment.whatsapp}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto"
                onClick={handleLeaveLine}
              >
                Cancelar Agendamento
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => setIsDetailsOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto"
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
