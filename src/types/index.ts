export type UserRole = 'user' | 'operator' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  cpf: string;
  birthDate: string;
  whatsapp: string;
  role: UserRole;
}

export type AppointmentStatus = 'pending' | 'waiting' | 'in_service' | 'assigned' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  cpf: string;
  name: string;
  whatsapp: string;
  birthDate: string;
  locationId: string;
  status: AppointmentStatus;
  operatorId?: string;
  queuePosition?: number;
  protocol?: string;
  createdAt: string;
  guardianCpf?: string;
}

export interface ServiceLocation {
  id: string;
  name: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  city: string;
  state: string;
  address?: string;
}

export interface AdminSettings {
  whatsappNumber: string;
  defaultMessage: string;
}
