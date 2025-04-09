import { Appointment, ServiceLocation, User, AdminSettings, AppointmentStatus } from "../types";
import { calculateAge } from "../utils/formatters";
import { supabase } from "@/integrations/supabase/client";

// Mock data storage
let users: User[] = [
  {
    id: '1',
    name: 'Admin Master',
    email: 'admin@agendrj.com',
    password: 'admin123',
    cpf: '12345678900',
    birthDate: '1990-01-01',
    whatsapp: '+5521999999999',
    role: 'master'
  },
  {
    id: '2',
    name: 'Operador Exemplo',
    email: 'operador@agendrj.com',
    password: 'operador123',
    cpf: '98765432100',
    birthDate: '1995-05-10',
    whatsapp: '+5521888888888',
    role: 'operator'
  }
];

let appointments: Appointment[] = [
  {
    id: '1',
    cpf: '12345678900',
    name: 'João Silva',
    whatsapp: '+5521999999999',
    birthDate: '1990-05-15',
    locationId: '1',
    status: 'pending',
    createdAt: '2023-04-01T10:00:00'
  },
  {
    id: '2',
    cpf: '98765432100',
    name: 'Maria Souza',
    whatsapp: '+5521888888888',
    birthDate: '1985-10-20',
    locationId: '2',
    status: 'waiting',
    operatorId: '2',
    queuePosition: 1,
    createdAt: '2023-04-01T09:00:00'
  },
  {
    id: '3',
    cpf: '11122233344',
    name: 'Ana Paula',
    whatsapp: '+5521777777777',
    birthDate: '2010-03-10', // Menor de idade
    locationId: '1',
    status: 'completed',
    operatorId: '2',
    queuePosition: 2,
    protocol: 'data:image/png;base64,iVBORw0KGgoA',
    createdAt: '2023-04-01T08:00:00',
    guardianCpf: '12345678900'
  }
];

let serviceLocations: ServiceLocation[] = [
  {
    id: '1',
    name: 'Centro de Atendimento Rio Centro',
    zipCode: '20021-130',
    street: 'Av. Rio Branco',
    number: '156',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ'
  },
  {
    id: '2',
    name: 'Posto Barra da Tijuca',
    zipCode: '22640-100',
    street: 'Av. das Américas',
    number: '4200',
    neighborhood: 'Barra da Tijuca',
    complement: 'Bloco 2',
    city: 'Rio de Janeiro',
    state: 'RJ'
  },
  {
    id: '3',
    name: 'Unidade Niterói',
    zipCode: '24020-053',
    street: 'Rua Visconde de Uruguai',
    number: '531',
    neighborhood: 'Centro',
    city: 'Niterói',
    state: 'RJ'
  }
];

let adminSettings: AdminSettings = {
  whatsappNumber: '+5521999999999',
  defaultMessage: 'Olá {name}, seu agendamento foi confirmado. Seu protocolo está anexado a esta mensagem.'
};

// Helper function to generate UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper to convert simple IDs to UUID format
function convertToUUID(simpleId: string): string {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(simpleId)) {
    return simpleId;
  }
  
  // Criar um UUID que mantém o ID original como parte do UUID
  // Formato: xxxxxxxx-xxxx-4xxx-axxx-ID padded to 12 chars
  const idPart = simpleId.toString().padStart(12, '0');
  return `${generateRandomHex(8)}-${generateRandomHex(4)}-4${generateRandomHex(3)}-${generateRandomHex(4)}-${idPart}`;
}

// Helper para gerar string hexadecimal aleatória
function generateRandomHex(length: number): string {
  let result = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  return result;
}

// Atualizar serviceLocations para ter IDs válidos em formato UUID
serviceLocations = serviceLocations.map(location => ({
  ...location,
  id: convertToUUID(location.id)
}));

// Helper function to clean up memory data
function cleanupDuplicateAppointments(supabaseApps: Appointment[]) {
  if (!supabaseApps || supabaseApps.length === 0) return;
  
  // Remover da memória os agendamentos que já existem no Supabase
  const supabaseIds = new Set(supabaseApps.map(app => app.id));
  appointments = appointments.filter(app => !supabaseIds.has(app.id));
  
  // Adicionar à memória os agendamentos que estão no Supabase mas não na memória
  supabaseApps.forEach(supabaseApp => {
    if (!appointments.some(memApp => memApp.id === supabaseApp.id)) {
      appointments.push(supabaseApp);
    }
  });
}

// API functions
export const api = {
  // Authentication
  login: async (email: string, password: string): Promise<User> => {
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Usuário não cadastrado');
    }
    
    if (user.password !== password) {
      throw new Error('Senha incorreta');
    }
    
    return { ...user };
  },
  
  register: async (userData: Omit<User, 'id'>): Promise<User> => {
    const existingUser = users.find(u => u.email === userData.email || u.cpf === userData.cpf);
    
    if (existingUser) {
      throw new Error('Usuário já cadastrado com este e-mail ou CPF');
    }
    
    const newUser: User = {
      ...userData,
      id: generateUUID()
    };
    
    users = [...users, newUser];
    return newUser;
  },
  
  // Appointments
  getAppointmentsByCPF: async (cpf: string): Promise<Appointment[]> => {
    try {
      // Primeiro buscar do Supabase
      const { data: supabaseAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('cpf', cpf);
      
      if (error) {
        console.error('Erro ao buscar do Supabase:', error);
        // Se falhar Supabase, usar apenas dados locais
        return appointments.filter(a => a.cpf === cpf);
      }
      
      if (supabaseAppointments && supabaseAppointments.length > 0) {
        console.log('Encontrados', supabaseAppointments.length, 'agendamentos no Supabase');
        
        // Limpar duplicatas na memória
        cleanupDuplicateAppointments(supabaseAppointments);
        
        // Filtrar agendamentos locais que não estão no Supabase
        const localOnlyAppointments = appointments.filter(
          localApp => localApp.cpf === cpf && 
          !supabaseAppointments.some(supabaseApp => supabaseApp.id === localApp.id)
        );
        
        console.log('Agendamentos apenas locais:', localOnlyAppointments.length);
        
        // Unir os resultados do Supabase com os locais que não foram sincronizados
        return [...supabaseAppointments, ...localOnlyAppointments];
      }
      
      // Se não encontrou nada no Supabase, usar apenas dados locais
      return appointments.filter(a => a.cpf === cpf);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return appointments.filter(a => a.cpf === cpf);
    }
  },
  
  createAppointment: async (appointmentData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'queuePosition' | 'protocol'>): Promise<Appointment> => {
    // Garantir que locationId seja um UUID válido
    console.log("locationId original:", appointmentData.locationId);
    console.log("Location original type:", typeof appointmentData.locationId);
    
    // Verificar se o location existe
    const locationExists = serviceLocations.find(loc => loc.id === appointmentData.locationId);
    console.log("Location encontrado diretamente:", locationExists);
    
    // Usar o locationId original como está se ele já estiver no formato UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUuid = uuidPattern.test(appointmentData.locationId);
    
    // Primeiro tenta encontrar o local através do ID não formatado
    let locationId = appointmentData.locationId;
    
    if (!isValidUuid) {
      // Se não for UUID, tenta localizar o serviceLocation correspondente
      const matchingLocation = serviceLocations.find(loc => {
        // Verifica se o final do UUID contém o ID original
        const locIdPart = loc.id.replace(/^.*-/, '').replace(/^0+/, '');
        return locIdPart === appointmentData.locationId.replace(/^0+/, '');
      });
      
      if (matchingLocation) {
        // Se encontrou o location, usa o ID formatado dele
        locationId = matchingLocation.id;
        console.log("Encontrado location compatível, usando ID:", locationId);
      } else {
        // Se não encontrou, converte o ID para UUID
        locationId = convertToUUID(appointmentData.locationId);
        console.log("Location não encontrado, convertendo para UUID:", locationId);
      }
    }
    
    console.log("locationId final usado:", locationId);
    
    const newAppointment = {
      ...appointmentData,
      locationId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // Check if person is under 15 and requires guardian CPF
    const age = calculateAge(appointmentData.birthDate);
    if (age < 15 && !appointmentData.guardianCpf) {
      throw new Error('CPF do responsável obrigatório para menores de 15 anos');
    }
    
    // Criar agendamento com ID gerado localmente
    const localAppointment: Appointment = {
      ...newAppointment,
      id: generateUUID()
    };
    
    // Tentar salvar no Supabase com o cliente Supabase
    try {
      console.log("Tentando salvar no Supabase com estes dados:", {
        cpf: appointmentData.cpf,
        name: appointmentData.name,
        whatsapp: appointmentData.whatsapp,
        birthDate: appointmentData.birthDate,
        locationId: locationId,
        status: 'pending',
        createdAt: new Date().toISOString(),
        guardianCpf: appointmentData.guardianCpf || null
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          cpf: appointmentData.cpf,
          name: appointmentData.name,
          whatsapp: appointmentData.whatsapp,
          birthDate: appointmentData.birthDate,
          locationId: locationId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          guardianCpf: appointmentData.guardianCpf || null
        })
        .select();
      
      if (error) {
        console.error("Erro ao salvar no Supabase:", error);
        console.error("Mensagem completa:", JSON.stringify(error));
        
        // Adicionar à memória o agendamento local
        appointments = [...appointments, localAppointment];
        return localAppointment;
      } else {
        console.log("Agendamento salvo com sucesso no Supabase:", data);
        
        // Se salvou com sucesso no Supabase, usar o ID e os dados do Supabase
        const supabaseAppointment = data[0] as Appointment;
        
        // Atualizar o armazenamento local com o dado do Supabase
        appointments = [...appointments, supabaseAppointment];
        
        return supabaseAppointment;
      }
    } catch (err) {
      console.error("Exceção ao salvar no Supabase:", err);
      
      // Em caso de erro, usar a versão local
      appointments = [...appointments, localAppointment];
      return localAppointment;
    }
  },
  
  updateAppointment: async (id: string, appointmentData: Partial<Appointment>): Promise<Appointment> => {
    const index = appointments.findIndex(a => a.id === id);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    const updatedAppointment = {
      ...appointments[index],
      ...appointmentData
    };
    
    // Atualizar em memória
    appointments[index] = updatedAppointment;
    
    // Tentar atualizar no Supabase em segundo plano (apenas para registro)
    fetch(`https://zgfeaagixqddwgqpycwu.supabase.co/rest/v1/appointments?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmVhYWdpeHFkZHdncXB5Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0NjEsImV4cCI6MjA1OTc3NTQ2MX0.xU8tBHW7WWYDgsmxT-_gvnrnBKnSDWCH90RroHIaCMU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmVhYWdpeHFkZHdncXB5Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0NjEsImV4cCI6MjA1OTc3NTQ2MX0.xU8tBHW7WWYDgsmxT-_gvnrnBKnSDWCH90RroHIaCMU',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(appointmentData)
    }).then(response => {
      if (response.ok) {
        console.log('Agendamento atualizado com sucesso no Supabase');
      } else {
        console.log('Não foi possível atualizar no Supabase, usando apenas dados locais');
      }
    }).catch(error => {
      console.log('Erro na comunicação com Supabase:', error);
    });
    
    return updatedAppointment;
  },
  
  deleteAppointment: async (id: string): Promise<void> => {
    // Atualizar em memória
    appointments = appointments.filter(a => a.id !== id);
    
    // Tentar excluir do Supabase em segundo plano (apenas para registro)
    fetch(`https://zgfeaagixqddwgqpycwu.supabase.co/rest/v1/appointments?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmVhYWdpeHFkZHdncXB5Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0NjEsImV4cCI6MjA1OTc3NTQ2MX0.xU8tBHW7WWYDgsmxT-_gvnrnBKnSDWCH90RroHIaCMU',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmVhYWdpeHFkZHdncXB5Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0NjEsImV4cCI6MjA1OTc3NTQ2MX0.xU8tBHW7WWYDgsmxT-_gvnrnBKnSDWCH90RroHIaCMU'
      }
    }).then(response => {
      if (response.ok) {
        console.log('Agendamento excluído com sucesso no Supabase');
      } else {
        console.log('Não foi possível excluir no Supabase, usando apenas dados locais');
      }
    }).catch(error => {
      console.log('Erro na comunicação com Supabase:', error);
    });
  },
  
  assignOperator: async (appointmentId: string, operatorId: string): Promise<Appointment> => {
    const appointment = appointments.find(a => a.id === appointmentId);
    
    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }
    
    const location = serviceLocations.find(l => l.id === appointment.locationId);
    
    if (!location) {
      throw new Error('Local de atendimento não encontrado');
    }
    
    // Calculate queue position based on city, creation date, and operator
    const queuePosition = appointments
      .filter(a => 
        a.status !== 'pending' && 
        a.status !== 'completed' && 
        a.status !== 'cancelled' && 
        a.operatorId === operatorId
      ).length + 1;
    
    const updatedAppointment = {
      ...appointment,
      status: 'assigned' as AppointmentStatus,
      operatorId,
      queuePosition
    };
    
    const index = appointments.findIndex(a => a.id === appointmentId);
    appointments[index] = updatedAppointment;
    
    return updatedAppointment;
  },
  
  startService: async (appointmentId: string): Promise<Appointment> => {
    const index = appointments.findIndex(a => a.id === appointmentId);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    const updatedAppointment = {
      ...appointments[index],
      status: 'in_service' as AppointmentStatus
    };
    
    appointments[index] = updatedAppointment;
    return updatedAppointment;
  },
  
  completeService: async (appointmentId: string, protocol: string): Promise<Appointment> => {
    const index = appointments.findIndex(a => a.id === appointmentId);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    const updatedAppointment = {
      ...appointments[index],
      status: 'completed' as AppointmentStatus,
      protocol
    };
    
    appointments[index] = updatedAppointment;
    return updatedAppointment;
  },
  
  abandonService: async (appointmentId: string, reason: string): Promise<Appointment> => {
    const index = appointments.findIndex(a => a.id === appointmentId);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    const updatedAppointment = {
      ...appointments[index],
      status: 'pending' as AppointmentStatus,
      operatorId: undefined,
      queuePosition: undefined
    };
    
    appointments[index] = updatedAppointment;
    return updatedAppointment;
  },
  
  // Reativar agendamento cancelado
  reactivateAppointment: async (appointmentId: string): Promise<Appointment> => {
    const index = appointments.findIndex(a => a.id === appointmentId);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    if (appointments[index].status !== 'cancelled') {
      throw new Error('Apenas agendamentos cancelados podem ser reativados');
    }
    
    const updatedAppointment = {
      ...appointments[index],
      status: 'pending' as AppointmentStatus,
      operatorId: undefined,
      queuePosition: undefined
    };
    
    // Atualizar em memória
    appointments[index] = updatedAppointment;
    
    // Tentar atualizar no Supabase
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'pending' })
        .eq('id', appointmentId)
        .select();
        
      if (error) {
        console.error('Erro ao reativar agendamento no Supabase:', error);
      } else {
        console.log('Agendamento reativado com sucesso no Supabase:', data);
      }
    } catch (err) {
      console.error('Exceção ao atualizar o Supabase:', err);
    }
    
    return updatedAppointment;
  },
  
  // Service Locations
  getServiceLocations: async (): Promise<ServiceLocation[]> => {
    // Adicionar logs para debug
    console.log("Locais de serviço disponíveis:", serviceLocations);
    
    // Garantir que todos os IDs estão no formato UUID
    return serviceLocations.map(location => ({
      ...location,
      id: convertToUUID(location.id)
    }));
  },
  
  getServiceLocationsByCity: async (city: string): Promise<ServiceLocation[]> => {
    return serviceLocations.filter(l => l.city.toLowerCase() === city.toLowerCase());
  },
  
  createServiceLocation: async (locationData: Omit<ServiceLocation, 'id'>): Promise<ServiceLocation> => {
    const newLocation: ServiceLocation = {
      ...locationData,
      id: generateUUID()
    };
    
    serviceLocations = [...serviceLocations, newLocation];
    return newLocation;
  },
  
  updateServiceLocation: async (id: string, locationData: Partial<ServiceLocation>): Promise<ServiceLocation> => {
    const index = serviceLocations.findIndex(l => l.id === id);
    
    if (index === -1) {
      throw new Error('Local de atendimento não encontrado');
    }
    
    const updatedLocation = {
      ...serviceLocations[index],
      ...locationData
    };
    
    serviceLocations[index] = updatedLocation;
    return updatedLocation;
  },
  
  deleteServiceLocation: async (id: string): Promise<void> => {
    serviceLocations = serviceLocations.filter(l => l.id !== id);
  },
  
  // Users
  getUsers: async (): Promise<User[]> => {
    return users.map(user => ({
      ...user,
      password: '******' // Don't return actual passwords
    }));
  },
  
  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      throw new Error('Usuário não encontrado');
    }
    
    const updatedUser = {
      ...users[index],
      ...userData
    };
    
    users[index] = updatedUser;
    return updatedUser;
  },
  
  deleteUser: async (id: string): Promise<void> => {
    users = users.filter(u => u.id !== id);
  },
  
  // Admin Settings
  getAdminSettings: async (): Promise<AdminSettings> => {
    return { ...adminSettings };
  },
  
  updateAdminSettings: async (settings: Partial<AdminSettings>): Promise<AdminSettings> => {
    adminSettings = {
      ...adminSettings,
      ...settings
    };
    
    return adminSettings;
  },
  
  // Address lookup by ZIP code
  lookupAddress: async (zipCode: string): Promise<Omit<ServiceLocation, 'id' | 'name' | 'number' | 'complement'>> => {
    // This would be a real API call in production
    // For demo, return mock data based on the ZIP code
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    // Mock data
    const mockAddresses: Record<string, Omit<ServiceLocation, 'id' | 'name' | 'number' | 'complement'>> = {
      '20021130': {
        zipCode: '20021-130',
        street: 'Av. Rio Branco',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ'
      },
      '22640100': {
        zipCode: '22640-100',
        street: 'Av. das Américas',
        neighborhood: 'Barra da Tijuca',
        city: 'Rio de Janeiro',
        state: 'RJ'
      },
      '24020053': {
        zipCode: '24020-053',
        street: 'Rua Visconde de Uruguai',
        neighborhood: 'Centro',
        city: 'Niterói',
        state: 'RJ'
      }
    };
    
    const normalizedZipCode = zipCode.replace(/\D/g, '');
    const address = mockAddresses[normalizedZipCode];
    
    if (!address) {
      throw new Error('CEP não encontrado');
    }
    
    return address;
  },
  
  // Get appointments by operator
  getAppointmentsByOperator: async (operatorId: string): Promise<Appointment[]> => {
    return appointments.filter(a => 
      a.operatorId === operatorId && 
      ['waiting', 'in_service', 'assigned'].includes(a.status)
    ).sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
  },
  
  // Get pending appointments
  getPendingAppointments: async (): Promise<Appointment[]> => {
    return appointments.filter(a => a.status === 'pending');
  },
  
  // Get stats for dashboard
  getStats: async () => {
    const totalAppointments = appointments.length;
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const inProgressCount = appointments.filter(a => ['waiting', 'in_service', 'assigned'].includes(a.status)).length;
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
    
    const byCity = serviceLocations.reduce((acc, location) => {
      const city = location.city;
      if (!acc[city]) acc[city] = 0;
      
      const locAppointments = appointments.filter(a => a.locationId === location.id).length;
      acc[city] += locAppointments;
      
      return acc;
    }, {} as Record<string, number>);
    
    const byOperator = users
      .filter(u => u.role === 'operator')
      .reduce((acc, operator) => {
        acc[operator.name] = appointments.filter(a => a.operatorId === operator.id).length;
        return acc;
      }, {} as Record<string, number>);
    
    return {
      totalAppointments,
      byStatus: {
        pending: pendingCount,
        inProgress: inProgressCount,
        completed: completedCount,
        cancelled: cancelledCount
      },
      byCity,
      byOperator
    };
  },
  
  // Adicionar função para buscar location por ID
  getServiceLocationById: async (id: string): Promise<ServiceLocation | null> => {
    console.log("API - Buscando service location, id recebido:", id);
    
    if (!id) {
      console.error("API - ID inválido:", id);
      return null;
    }
    
    // Impressão dos locations disponíveis
    console.log("API - Service locations disponíveis:", 
      serviceLocations.map(l => ({ id: l.id, name: l.name }))
    );
    
    // Estratégia 1: ID exato
    let location = serviceLocations.find(loc => loc.id === id);
    if (location) {
      console.log("API - Location encontrado com ID exato:", location.name);
      return location;
    }
    
    // Estratégia 2: ID convertido
    const convertedId = convertToUUID(id);
    location = serviceLocations.find(loc => loc.id === convertedId);
    if (location) {
      console.log("API - Location encontrado com ID convertido:", location.name);
      return location;
    }
    
    // Estratégia 3: Parte numérica do ID
    if (id) {
      // Extrair a parte numérica do ID - padrão esperado: xxxxx-xxxxx-xxxx-xxxxx-000000000001
      const matches = id.match(/([0-9]+)$/);
      if (matches && matches[1]) {
        const numericId = matches[1].replace(/^0+/, ''); // Remover zeros à esquerda
        
        // Procurar por locations que tenham a mesma parte numérica no final do UUID
        for (const loc of serviceLocations) {
          // Extrair a parte numérica do ID do location
          const locMatches = loc.id.match(/([0-9]+)$/);
          if (locMatches && locMatches[1]) {
            const locNumericId = locMatches[1].replace(/^0+/, '');
            
            console.log(`API - Comparando IDs numéricos: ${numericId} com ${locNumericId}`);
            
            if (locNumericId === numericId || locNumericId === id || numericId === loc.id) {
              console.log("API - Location encontrado por comparação numérica:", loc.name);
              return loc;
            }
          }
        }
      }
    }
    
    // Estratégia 4: Comparação simples pelo ID de string original (não UUID)
    for (const loc of serviceLocations) {
      if (loc.id.includes(id) || id.includes(loc.id)) {
        console.log("API - Location encontrado por substring:", loc.name);
        return loc;
      }
    }
    
    console.log("API - Nenhum location encontrado para o ID:", id);
    return null;
  }
};
