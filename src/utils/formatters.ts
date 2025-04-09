
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formats a CPF string to "xxx.xxx.xxx-xx" format
 */
export function formatCPF(cpf: string): string {
  // Remove non-numeric characters
  const numericCPF = cpf.replace(/\D/g, '');
  
  // Format as xxx.xxx.xxx-xx
  return numericCPF
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .substring(0, 14);
}

/**
 * Formats a phone number to Brazilian format "(xx) x xxxx-xxxx"
 */
export function formatPhone(phone: string): string {
  // Remove non-numeric characters
  const numericPhone = phone.replace(/\D/g, '');
  
  // Format as (xx) x xxxx-xxxx
  return numericPhone
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')
    .substring(0, 16);
}

/**
 * Converts phone number to international format +55XXXXXXXXXXX
 */
export function phoneToInternational(phone: string): string {
  // Remove all non-numeric characters
  const numericPhone = phone.replace(/\D/g, '');
  
  // Add +55 prefix if not present
  if (numericPhone.startsWith('55')) {
    return `+${numericPhone}`;
  } else {
    return `+55${numericPhone}`;
  }
}

/**
 * Format date to local BR format (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Returns status label based on appointment status
 */
export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Em atribuição',
    waiting: 'Em Atendimento',
    in_service: 'Em Atendimento',
    assigned: 'Em Atendimento',
    completed: 'Atendimento Realizado',
    cancelled: 'Cancelado'
  };
  
  return statusMap[status] || 'Status desconhecido';
}

/**
 * Validates CPF format
 */
export function isValidCPF(cpf: string): boolean {
  const numericCPF = cpf.replace(/\D/g, '');
  return numericCPF.length === 11;
}

/**
 * Validates phone format
 */
export function isValidPhone(phone: string): boolean {
  const numericPhone = phone.replace(/\D/g, '');
  return numericPhone.length >= 10 && numericPhone.length <= 11;
}

/**
 * Calculates age from birth date
 */
export function calculateAge(birthdate: string): number {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}
