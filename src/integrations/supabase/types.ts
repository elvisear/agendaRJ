export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          id?: string
          cpf: string
          name: string
          whatsapp: string
          birthDate: string
          locationId: string
          status: string
          operatorId?: string | null
          queuePosition?: number | null
          protocol?: string | null
          createdAt: string
          guardianCpf?: string | null
        }
        Insert: {
          id?: string
          cpf: string
          name: string
          whatsapp: string
          birthDate: string
          locationId: string
          status: string
          operatorId?: string | null
          queuePosition?: number | null
          protocol?: string | null
          createdAt: string
          guardianCpf?: string | null
        }
        Update: {
          id?: string
          cpf?: string
          name?: string
          whatsapp?: string
          birthDate?: string
          locationId?: string
          status?: string
          operatorId?: string | null
          queuePosition?: number | null
          protocol?: string | null
          createdAt?: string
          guardianCpf?: string | null
        }
      }
      users: {
        Row: {
          id: string
          name: string
          email: string
          password: string
          cpf: string
          whatsapp: string
          role: string
        }
        Insert: {
          id: string
          name: string
          email: string
          password: string
          cpf: string
          whatsapp: string
          role: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password?: string
          cpf?: string
          whatsapp?: string
          role?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 
