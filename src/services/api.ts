import { Appointment, ServiceLocation, User, AdminSettings, AppointmentStatus } from "../types";
import { calculateAge, validateCPF } from "../utils/formatters";
import { supabase, supabaseAdmin } from "@/integrations/supabase/client";

// Função helper para determinar qual cliente Supabase usar
const getSupabaseClient = async () => {
  // Testar se o cliente Admin está funcionando corretamente
  try {
    const { error: testError } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });
    if (testError && testError.message?.includes('Invalid API key')) {
      console.warn("Chave de serviço do Supabase inválida. Usando cliente normal.");
      return supabase;
    } else {
      return supabaseAdmin;
    }
  } catch (e) {
    console.warn("Erro ao testar cliente Admin. Usando cliente normal:", e);
    return supabase;
  }
};

// Interfaces auxiliares para lidar com a diferença entre o modelo User da aplicação e o do banco
interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  cpf: string;
  whatsapp: string;
  role: string;
  is_active?: boolean; // No banco o nome da coluna é is_active
}

// Função para converter um User da aplicação para o formato do banco
function toDbUser(user: Omit<User, 'id'> | User): Omit<DbUser, 'id'> | DbUser {
  // Desestruturar para extrair apenas os campos que existem no banco
  const { name, email, password, cpf, whatsapp, role, isActive, ...rest } = user;
  
  // Se o user tem id, incluí-lo no objeto retornado
  if ('id' in rest) {
    return {
      id: rest.id,
      name,
      email,
      password,
      cpf,
      whatsapp,
      role,
      is_active: isActive // Mapear isActive para is_active
    };
  }
  
  // Caso contrário, retornar sem id
  return {
    name,
    email,
    password,
    cpf,
    whatsapp,
    role,
    is_active: isActive // Mapear isActive para is_active
  };
}

// Função para converter um User do banco para o modelo da aplicação
function fromDbUser(dbUser: DbUser, originalUser?: Partial<User>): User {
  // Se temos o usuário original, preservamos campos como birthDate
  if (originalUser) {
    return {
      ...originalUser,
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      password: dbUser.password,
      cpf: dbUser.cpf,
      whatsapp: dbUser.whatsapp,
      role: dbUser.role as UserRole,
      isActive: dbUser.is_active !== false, // Importante: considerar undefined ou null como true
      // birthDate é mantido do originalUser ou definido como string vazia
      birthDate: originalUser.birthDate || ''
    };
  }
  
  // Se não temos o usuário original, criamos um com birthDate vazio
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    password: dbUser.password,
    cpf: dbUser.cpf,
    whatsapp: dbUser.whatsapp,
    role: dbUser.role as UserRole,
    isActive: dbUser.is_active !== false, // Importante: considerar undefined ou null como true
    birthDate: '' // Valor padrão, já que não está no banco
  };
}

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
    role: 'master',
    isActive: true
  },
  {
    id: '2',
    name: 'Operador Exemplo',
    email: 'operador@agendrj.com',
    password: 'operador123',
    cpf: '98765432100',
    birthDate: '1995-05-10',
    whatsapp: '+5521888888888',
    role: 'operator',
    isActive: true
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

// Array vazio para evitar dados mockados no frontend
let serviceLocations: ServiceLocation[] = [];

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

// Função auxiliar para calcular estatísticas com base em dados locais
function getLocalStats() {
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
}

// API functions
export const api = {
  // Authentication
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    try {
      // Tentar login com Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro de autenticação no Supabase:', error);
        
        // Verificar primeiro se o usuário existe, independente da senha
        const { data: userData, error: userCheckError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .single();
          
        if (userCheckError && userCheckError.code === 'PGRST116') {
          // Código PGRST116 indica que nenhum registro foi encontrado
          console.log('Usuário não encontrado para o email:', email);
      throw new Error('Usuário não cadastrado');
        } else {
          // Usuário existe, então o problema deve ser a senha
          console.log('Senha incorreta para o usuário:', email);
          throw new Error('Senha incorreta');
        }
      }

      // Login com Supabase Auth bem-sucedido
      console.log('Login com Supabase Auth bem-sucedido:', data.user?.id);

      // Buscar os dados completos do usuário no banco
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('Erro ao buscar dados do usuário no Supabase:', userError);
        throw new Error('Falha ao buscar dados do usuário');
      }

      if (!userData) {
        console.error('Usuário não encontrado no banco de dados');
        throw new Error('Usuário não encontrado');
      }

      // Verificar se o usuário está ativo
      if (userData.is_active === false) {
        console.warn('Tentativa de login de usuário inativo:', email);
        // Fazer logout já que o usuário conseguiu autenticar mas está inativo
        await supabase.auth.signOut();
        throw new Error('Seu usuário está inativo no sistema! Por favor entre em contato com a administração do sistema.');
      }

      const user = fromDbUser(userData as DbUser);
      console.log('Dados do usuário recuperados:', user.name, 'Papel:', user.role);

      // Armazenar o token
      const token = data.session?.access_token || '';

      return { user, token };
    } catch (error) {
      // Se o erro for específico de usuário inativo ou usuário não cadastrado, repassamos
      if (error instanceof Error && 
          (error.message.includes('Usuário inativo') || 
           error.message.includes('Usuário não cadastrado') ||
           error.message.includes('Senha incorreta'))) {
        throw error;
      }
      
      // Tentar fazer login localmente como fallback
      console.log('Tentando login local como fallback');
      
      // Verificar se o usuário existe localmente
      const userWithEmail = users.find((u) => u.email === email);
      
      if (!userWithEmail) {
        throw new Error('Usuário não cadastrado');
      }
      
      // Verificar se a senha está correta
      const user = users.find((u) => u.email === email && u.password === password);
      
      if (!user) {
      throw new Error('Senha incorreta');
    }
    
      // Verificar se o usuário está ativo mesmo localmente
      if (user.isActive === false) {
        console.warn('Tentativa de login de usuário inativo (local):', email);
        throw new Error('Seu usuário está inativo no sistema! Por favor entre em contato com a administração do sistema.');
      }

      console.log('Login local bem-sucedido:', user.name);
      return { user, token: 'local-token' };
    }
  },
  
  register: async (userData: Omit<User, 'id'>): Promise<User> => {
    try {
      console.log('Registrando novo usuário:', userData.name);
    
      // Verificar se o email já existe
      const existingUser = users.find((u) => u.email === userData.email);
    if (existingUser) {
        throw new Error('Este email já está em uso');
      }

      // Verificar se o CPF já existe
      const existingCpf = users.find((u) => u.cpf === userData.cpf);
      if (existingCpf) {
        throw new Error('Este CPF já está cadastrado');
      }

      // Primeiro criamos o usuário na autenticação do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || generateRandomHex(12),
      });

      if (authError) {
        console.error('Erro ao criar usuário na autenticação do Supabase:', authError);
        throw new Error(authError.message);
      }

      // Se não temos um ID do usuário, algo deu errado
      if (!authData.user?.id) {
        console.error('Falha ao criar usuário: nenhum ID retornado');
        throw new Error('Falha ao criar usuário');
      }

      const userId = authData.user.id;
      console.log('Usuário criado na autenticação do Supabase, ID:', userId);

      // Por padrão, todo novo usuário é criado como ativo
      const userToInsert: DbUser = {
        id: userId,
        name: userData.name,
        email: userData.email,
        password: userData.password || '',
        cpf: userData.cpf,
        whatsapp: userData.whatsapp || '',
        role: userData.role || 'user',
        is_active: true // Todo novo usuário começa como ativo
      };

      // Agora inserimos os dados completos na tabela de usuários
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('users')
        .insert(userToInsert)
        .select('*')
        .single();

      if (insertError) {
        console.error('Erro ao inserir dados do usuário no Supabase:', insertError);
        // Se falhar, criar usuário apenas localmente
        console.log('Criando usuário apenas localmente como fallback');
      }

      // Criar o usuário localmente (com os dados do banco ou nossos dados originais)
    const newUser: User = {
        id: userId,
        name: userData.name,
        email: userData.email,
        password: userData.password,
        cpf: userData.cpf,
        whatsapp: userData.whatsapp || '',
        role: userData.role || 'user',
        isActive: true, // Todo novo usuário começa como ativo
        birthDate: userData.birthDate || ''
      };

      users.push(newUser);
      console.log('Usuário criado com sucesso:', newUser.name);

    return newUser;
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      throw error;
    }
  },
  
  updateUser: async (user: User): Promise<User> => {
    try {
      console.log("Atualizando usuário:", user);
      
      // Verificar se o usuário existe localmente
      const localUserIndex = users.findIndex(u => u.id === user.id);
      if (localUserIndex === -1) {
        throw new Error("Usuário não encontrado");
      }
      
      // Atualizar localmente primeiro
      users[localUserIndex] = { ...user };
      
      // Obter o cliente Supabase apropriado
      const client = await getSupabaseClient();
      
      // Tentar atualizar no Supabase
      const { data: updatedUser, error } = await client
        .from('users')
        .update({
          name: user.name,
          email: user.email,
          cpf: user.cpf,
          birthDate: user.birthDate,
          whatsapp: user.whatsapp,
          role: user.role
          // Não atualizamos a senha aqui - isso deve ser feito através da API de auth
        })
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao atualizar usuário no Supabase:", error);
        console.warn("Dados foram atualizados apenas localmente");
        
        // Se houver erro, pelo menos mantemos a atualização local
        return users[localUserIndex];
      }
      
      console.log("Usuário atualizado com sucesso no Supabase:", updatedUser);
      return updatedUser as User;
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      throw error;
    }
  },
  
  getAllUsers: async (): Promise<User[]> => {
    try {
      console.log("Buscando todos os usuários do Supabase");
      
      // Usar o cliente admin para ter acesso a todos os usuários
      const { data: supabaseUsers, error } = await supabaseAdmin
        .from('users')
        .select('*');
      
      if (error) {
        console.error("Erro ao buscar usuários do Supabase:", error);
        console.warn("Usando dados locais como fallback para usuários - APENAS EM CASO DE ERRO");
        return users.map(user => ({
          ...user,
          password: '******' // Não retornar senhas reais
        }));
      }
      
      if (supabaseUsers && supabaseUsers.length > 0) {
        console.log(`Encontrados ${supabaseUsers.length} usuários no Supabase`);
        console.log("Dados brutos dos usuários:", supabaseUsers);
        
        // Converter usuários do formato do banco para o formato da aplicação
        const appUsers = supabaseUsers.map(dbUser => {
          // Verificar se já temos esse usuário em memória local para manter a senha
          const localUser = users.find(u => u.id === dbUser.id);
          
          const mappedUser = {
            id: dbUser.id,
            name: dbUser.name || '',
            email: dbUser.email || '',
            password: localUser?.password || '******',
            cpf: dbUser.cpf || '',
            birthDate: dbUser.birthDate || '',
            whatsapp: dbUser.whatsapp || '',
            role: dbUser.role as UserRole,
            isActive: dbUser.is_active !== false // Importante: considerar undefined ou null como true
          };
          
          console.log(`Usuário ${dbUser.email} mapeado - isActive no banco:`, dbUser.is_active, "mapeado para:", mappedUser.isActive);
          
          return mappedUser;
        });
        
        // Atualizar os usuários em memória para uso futuro
        users = appUsers;
        
        // Não retornar senhas reais na resposta
        return appUsers.map(user => ({
          ...user,
          password: '******'
        }));
      }
      
      // Se não encontrou usuários no Supabase
      console.log("Nenhum usuário encontrado no Supabase, usando dados locais");
      return users.map(user => ({
        ...user,
        password: '******' // Não retornar senhas reais
      }));
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      return users.map(user => ({
        ...user,
        password: '******' // Não retornar senhas reais
      }));
    }
  },
  
  deleteUser: async (userId: string): Promise<void> => {
    try {
      // Obter o cliente Supabase apropriado
      const client = await getSupabaseClient();
      
      // Tentar deletar da API de autenticação
      try {
        if (client === supabaseAdmin) {
          await client.auth.admin.deleteUser(userId);
          console.log("Usuário removido da autenticação Supabase");
        } else {
          console.warn("Cliente admin não disponível. Não foi possível remover da autenticação.");
        }
      } catch (authError) {
        console.warn("Não foi possível remover o usuário da autenticação:", authError);
      }
      
      // Deletar do banco de dados Supabase
      const { error } = await client
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error("Erro ao remover usuário do banco de dados:", error);
      } else {
        console.log("Usuário removido do banco de dados com sucesso");
      }
      
      // Remover da lista local
      users = users.filter(u => u.id !== userId);
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      throw error;
    }
  },
  
  // Get all appointment statuses
  getAllAppointmentStatuses: (): string[] => {
    return ['pending', 'waiting', 'assigned', 'in_service', 'completed', 'cancelled'];
  },
  
  // Appointments
  getAppointmentsByCPF: async (cpf: string): Promise<Appointment[]> => {
    try {
      // Primeiro buscar do Supabase - sem filtro de status para trazer todos
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
    // Validar CPF
    const cleanCpf = appointmentData.cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCpf)) {
      throw new Error('CPF inválido');
    }
    
    // Calcular idade e validar CPF do responsável se necessário
    const age = calculateAge(appointmentData.birthDate);
    if (age < 15) {
      if (!appointmentData.guardianCpf) {
        throw new Error('CPF do responsável obrigatório para menores de 15 anos');
      }
      
      const cleanGuardianCpf = appointmentData.guardianCpf.replace(/\D/g, '');
      if (!validateCPF(cleanGuardianCpf)) {
        throw new Error('CPF do responsável inválido');
      }
    }
    
    // Garantir que locationId seja um UUID válido
    console.log("locationId original:", appointmentData.locationId);
    console.log("Location original type:", typeof appointmentData.locationId);
    
    // Primeiro verificar se o locationId existe no Supabase
    let locationId = appointmentData.locationId;
    try {
      console.log("Verificando se o local existe no Supabase:", locationId);
      
      // Primeiro tentar localizar o local direto pelo ID
      const { data: locationData, error: locationError } = await supabaseAdmin
        .from('service_locations')
        .select('id')
        .eq('id', locationId)
        .single();
      
      if (locationError || !locationData) {
        console.log("Local não encontrado diretamente, buscando alternativas...");
        
        // Se não encontrou diretamente, buscar todos os locais
        const { data: allLocations, error } = await supabaseAdmin
          .from('service_locations')
          .select('id');
        
        if (error || !allLocations) {
          console.error("Erro ao buscar locais:", error);
          throw new Error("Não foi possível verificar se o local existe. Por favor, certifique-se de que o local está cadastrado no banco.");
        }
        
        console.log("Postos disponíveis no banco:", allLocations.map(l => l.id));
        
        // Verificar se algum ID no banco corresponde ao ID informado
        const matchingLocation = allLocations.find(loc => {
          // Verifica se o final do UUID contém o ID original
          const locIdPart = loc.id.replace(/^.*-/, '').replace(/^0+/, '');
          return locIdPart === locationId.replace(/^0+/, '');
        });
        
        if (matchingLocation) {
          // Se encontrou o location, usa o ID formatado dele
          locationId = matchingLocation.id;
          console.log("Encontrado location compatível, usando ID:", locationId);
        } else {
          console.error("Erro: Local não encontrado no banco de dados");
          throw new Error("O local selecionado não existe no banco de dados. Por favor, selecione um local válido.");
        }
      } else {
        console.log("Local encontrado diretamente no banco:", locationData.id);
      }
    } catch (error) {
      console.error("Erro ao verificar local:", error);
      throw new Error("Erro ao verificar o local. Por favor, tente novamente.");
    }
    
    console.log("locationId final usado:", locationId);
    
    const newAppointment = {
      ...appointmentData,
      locationId,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
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
      
      const { data, error } = await supabaseAdmin
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
    
    // Tentar atualizar no Supabase
    try {
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .update(appointmentData)
        .eq('id', id)
        .select();
        
      if (error) {
        console.error('Erro ao atualizar agendamento no Supabase:', error);
        console.log('Usando apenas dados locais como fallback');
      } else {
        console.log('Agendamento atualizado com sucesso no Supabase:', data);
      }
    } catch (err) {
      console.error('Exceção ao atualizar o Supabase:', err);
    }
    
    return updatedAppointment;
  },
  
  deleteAppointment: async (id: string): Promise<void> => {
    // Atualizar em memória
    appointments = appointments.filter(a => a.id !== id);
    
    // Tentar excluir do Supabase
    try {
      const { error } = await supabaseAdmin
        .from('appointments')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Erro ao excluir agendamento do Supabase:', error);
        console.log('Agendamento excluído apenas localmente');
      } else {
        console.log('Agendamento excluído com sucesso do Supabase');
      }
    } catch (err) {
      console.error('Exceção ao excluir do Supabase:', err);
    }
  },
  
  assignOperator: async (appointmentId: string, operatorId: string): Promise<Appointment> => {
    try {
      console.log(`Atribuindo operador ${operatorId} ao agendamento ${appointmentId}`);
      
      // Primeiro tentar buscar do Supabase
      const { data: supabaseAppointment, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      let appointment;
      
      if (error) {
        console.error('Erro ao buscar agendamento do Supabase:', error);
        console.log('Tentando encontrar agendamento na memória local');
        // Se não encontrar no Supabase, tentar na memória local
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
        appointment = appointments[index];
      } else {
        console.log('Agendamento encontrado no Supabase:', supabaseAppointment);
        appointment = supabaseAppointment as Appointment;
        
        // Verificar se o agendamento já existe na memória local, atualizar se necessário
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index >= 0) {
          appointments[index] = appointment;
        } else {
          // Adicionar à lista local se não existir
          appointments.push(appointment);
        }
      }
      
      if (!appointment) {
        throw new Error('Agendamento não encontrado');
      }
      
      // Calcular posição na fila com base na cidade, data de criação e operador
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
    
      // Atualizar na lista local
    const index = appointments.findIndex(a => a.id === appointmentId);
      if (index >= 0) {
    appointments[index] = updatedAppointment;
      }
      
      // Atualizar no Supabase
      try {
        const { data, error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            status: 'assigned',
            operatorId,
            queuePosition
          })
          .eq('id', appointmentId)
          .select();
          
        if (updateError) {
          console.error('Erro ao atualizar agendamento no Supabase:', updateError);
        } else {
          console.log('Agendamento atualizado com sucesso no Supabase:', data);
        }
      } catch (err) {
        console.error('Erro na atualização no Supabase:', err);
      }
    
    return updatedAppointment;
    } catch (error) {
      console.error('Erro no assignOperator:', error);
      throw error;
    }
  },
  
  startService: async (appointmentId: string): Promise<Appointment> => {
    try {
      console.log(`Iniciando atendimento do agendamento ${appointmentId}`);
      
      // Primeiro tentar buscar do Supabase
      const { data: supabaseAppointment, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      let appointment;
      
      if (error) {
        console.error('Erro ao buscar agendamento do Supabase:', error);
        console.log('Tentando encontrar agendamento na memória local');
        // Se não encontrar no Supabase, tentar na memória local
        const index = appointments.findIndex(a => a.id === appointmentId);
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
        }
        appointment = appointments[index];
      } else {
        console.log('Agendamento encontrado no Supabase:', supabaseAppointment);
        appointment = supabaseAppointment as Appointment;
        
        // Verificar se o agendamento já existe na memória local, atualizar se necessário
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index >= 0) {
          appointments[index] = appointment;
        } else {
          // Adicionar à lista local se não existir
          appointments.push(appointment);
        }
    }
    
    const updatedAppointment = {
        ...appointment,
      status: 'in_service' as AppointmentStatus
    };
    
      // Atualizar na lista local
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index >= 0) {
    appointments[index] = updatedAppointment;
      }
      
      // Atualizar no Supabase
      try {
        const { data, error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            status: 'in_service'
          })
          .eq('id', appointmentId)
          .select();
          
        if (updateError) {
          console.error('Erro ao atualizar status do agendamento no Supabase:', updateError);
        } else {
          console.log('Status do agendamento atualizado com sucesso no Supabase:', data);
        }
      } catch (err) {
        console.error('Erro na atualização no Supabase:', err);
      }
      
    return updatedAppointment;
    } catch (error) {
      console.error('Erro no startService:', error);
      throw error;
    }
  },
  
  completeService: async (appointmentId: string, protocol: string): Promise<Appointment> => {
    try {
      console.log(`Concluindo atendimento do agendamento ${appointmentId}`);
      
      // Primeiro tentar buscar do Supabase
      const { data: supabaseAppointment, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      let appointment;
      
      if (error) {
        console.error('Erro ao buscar agendamento do Supabase:', error);
        console.log('Tentando encontrar agendamento na memória local');
        // Se não encontrar no Supabase, tentar na memória local
        const index = appointments.findIndex(a => a.id === appointmentId);
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
        }
        appointment = appointments[index];
      } else {
        console.log('Agendamento encontrado no Supabase:', supabaseAppointment);
        appointment = supabaseAppointment as Appointment;
        
        // Verificar se o agendamento já existe na memória local, atualizar se necessário
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index >= 0) {
          appointments[index] = appointment;
        } else {
          // Adicionar à lista local se não existir
          appointments.push(appointment);
        }
    }
    
    const updatedAppointment = {
        ...appointment,
      status: 'completed' as AppointmentStatus,
      protocol
    };
    
      // Atualizar na lista local
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index >= 0) {
    appointments[index] = updatedAppointment;
      }
      
      // Atualizar no Supabase
      try {
        const { data, error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            status: 'completed',
            protocol
          })
          .eq('id', appointmentId)
          .select();
          
        if (updateError) {
          console.error('Erro ao atualizar status do agendamento no Supabase:', updateError);
        } else {
          console.log('Status do agendamento atualizado com sucesso no Supabase:', data);
        }
      } catch (err) {
        console.error('Erro na atualização no Supabase:', err);
      }
      
    return updatedAppointment;
    } catch (error) {
      console.error('Erro no completeService:', error);
      throw error;
    }
  },
  
  abandonService: async (appointmentId: string, reason: string): Promise<Appointment> => {
    try {
      console.log(`Abandonando atendimento do agendamento ${appointmentId}. Motivo: ${reason}`);
      
      // Primeiro tentar buscar do Supabase
      const { data: supabaseAppointment, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
      
      let appointment;
      
      if (error) {
        console.error('Erro ao buscar agendamento do Supabase:', error);
        console.log('Tentando encontrar agendamento na memória local');
        // Se não encontrar no Supabase, tentar na memória local
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index === -1) {
          throw new Error('Agendamento não encontrado');
        }
        appointment = appointments[index];
      } else {
        console.log('Agendamento encontrado no Supabase:', supabaseAppointment);
        appointment = supabaseAppointment as Appointment;
        
        // Verificar se o agendamento já existe na memória local, atualizar se necessário
        const index = appointments.findIndex(a => a.id === appointmentId);
        if (index >= 0) {
          appointments[index] = appointment;
        } else {
          // Adicionar à lista local se não existir
          appointments.push(appointment);
        }
      }
      
      const updatedAppointment = {
        ...appointment,
        status: 'pending' as AppointmentStatus,
        operatorId: undefined,
        queuePosition: undefined
      };
      
      // Atualizar na lista local
      const index = appointments.findIndex(a => a.id === appointmentId);
      if (index >= 0) {
        appointments[index] = updatedAppointment;
      }
      
      // Atualizar no Supabase
      try {
        const { data, error: updateError } = await supabaseAdmin
          .from('appointments')
          .update({
            status: 'pending',
            operatorId: null,
            queuePosition: null
          })
          .eq('id', appointmentId)
          .select();
          
        if (updateError) {
          console.error('Erro ao atualizar status do agendamento no Supabase:', updateError);
        } else {
          console.log('Status do agendamento atualizado com sucesso no Supabase:', data);
        }
      } catch (err) {
        console.error('Erro na atualização no Supabase:', err);
      }
      
      return updatedAppointment;
    } catch (error) {
      console.error('Erro no abandonService:', error);
      throw error;
    }
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
    return api.getAllServiceLocations();
  },
  
  getServiceLocation: async (id: string): Promise<ServiceLocation | null> => {
    try {
      // Verificar se o ID é um UUID válido antes de consultar o Supabase
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      // Se não for um UUID válido, procurar por correspondência local primeiro
      if (!uuidPattern.test(id)) {
        console.log(`ID ${id} não é um UUID válido, procurando correspondência local primeiro`);
        
        // Procurar local na lista local por ID exato
        const localLocation = serviceLocations.find(loc => loc.id === id);
        if (localLocation) {
          console.log(`Localização encontrada em dados locais para ID simples ${id}:`, localLocation.name);
          return localLocation;
        }
        
        // Procurar local que tenha esse ID no final do UUID (compatibilidade)
        const compatLocation = serviceLocations.find(loc => {
          const locIdPart = loc.id.replace(/^.*-/, '').replace(/^0+/, '');
          return locIdPart === id.replace(/^0+/, '');
        });
        
        if (compatLocation) {
          console.log(`Localização encontrada por compatibilidade para ID ${id}:`, compatLocation.name);
          return compatLocation;
        }
        
        // Se não encontrar na lista local, não tentar o Supabase (evita o erro 400)
        console.log(`Nenhuma localização encontrada para ID simples ${id}, não consultando Supabase`);
        return null;
      }
      
      // Buscar do Supabase apenas se o ID for um UUID válido
      console.log(`Buscando localização com UUID válido ${id} do Supabase`);
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Erro ao buscar posto ${id} do Supabase:`, error);
        
        // Buscar local como fallback
        const localLocation = serviceLocations.find(loc => loc.id === id);
        return localLocation || null;
      }
      
      if (data) {
        // Os campos já estão em camelCase, não precisa converter
        return data as ServiceLocation;
      }
      
      const localLocation = serviceLocations.find(loc => loc.id === id);
      return localLocation || null;
    } catch (error) {
      console.error(`Erro ao buscar posto ${id}:`, error);
      
      // Buscar local como fallback
      const localLocation = serviceLocations.find(loc => loc.id === id);
      return localLocation || null;
    }
  },
  
  getAllServiceLocations: async (): Promise<ServiceLocation[]> => {
    try {
      console.log("Buscando todos os postos de serviço do Supabase");
      
      // Buscar do Supabase
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .select('*');
      
      if (error) {
        console.error('Erro ao buscar postos de serviço do Supabase:', error);
        console.log('Usando dados locais como fallback - APENAS EM CASO DE ERRO');
        return [...serviceLocations]; // Retorna cópia da lista local apenas em caso de erro
      }
      
      // Retornar os dados do Supabase mesmo se for array vazio
      // Isso garante que apenas postos realmente no banco serão exibidos
      console.log(`Encontrados ${data?.length || 0} postos de serviço no Supabase:`, 
        data?.map(loc => ({ id: loc.id, name: loc.name })));
      
      // Os campos já estão em camelCase, não precisa converter
      const serviceLocationsFromDb = data as ServiceLocation[] || [];
      
      // Atualizar a lista local com os dados do Supabase para uso futuro
      serviceLocations = serviceLocationsFromDb;
      
      // Retorna os postos do banco, mesmo se for array vazio
      return serviceLocationsFromDb;
    } catch (error) {
      console.error('Erro ao buscar postos de serviço:', error);
      console.log('Usando dados locais como fallback devido a ERRO GRAVE');
      return [...serviceLocations]; // Retorna cópia da lista local apenas em caso de erro grave
    }
  },
  
  getServiceLocationsByCity: async (city: string): Promise<ServiceLocation[]> => {
    try {
      // Buscar do Supabase
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .select('*')
        .ilike('city', city);
      
      if (error) {
        console.error(`Erro ao buscar postos da cidade ${city} do Supabase:`, error);
        // Como fallback, buscar todos e depois filtrar
        const allLocations = await api.getAllServiceLocations();
        return allLocations.filter(l => l.city.toLowerCase() === city.toLowerCase());
      }
      
      // Os campos já estão em camelCase, não precisa converter
      const serviceLocationsFromDb = data as ServiceLocation[] || [];
      
      // Retornar os dados do Supabase mesmo se for array vazio
      console.log(`Encontrados ${serviceLocationsFromDb.length} postos em ${city} no Supabase`);
      return serviceLocationsFromDb;
    } catch (error) {
      console.error(`Erro ao buscar postos da cidade ${city}:`, error);
      // Como fallback, buscar todos e depois filtrar
      const allLocations = await api.getAllServiceLocations();
      return allLocations.filter(l => l.city.toLowerCase() === city.toLowerCase());
    }
  },
  
  createServiceLocation: async (location: Omit<ServiceLocation, 'id'>): Promise<ServiceLocation> => {
    console.log("Criando posto de atendimento:", location);
    
    try {
      // Usar o cliente admin explicitamente para ter permissões adequadas
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .insert([location])
        .select();
      
      if (error) {
        console.error("Erro ao criar posto de atendimento:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("Não foi possível criar o posto de atendimento");
      }
      
      const newLocation = data[0] as ServiceLocation;
      console.log("Posto de atendimento criado com sucesso:", newLocation);
      
      // Adicionar à lista local
      serviceLocations.push(newLocation);
      
    return newLocation;
    } catch (error) {
      console.error("Erro ao criar posto de atendimento:", error);
      throw error;
    }
  },
  
  // Atualizar um posto de atendimento
  updateServiceLocation: async (locationId: string, updatedLocation: Partial<ServiceLocation>): Promise<ServiceLocation> => {
    console.log("Atualizando posto de atendimento:", locationId, updatedLocation);
    
    try {
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .update(updatedLocation)
        .eq('id', locationId)
        .select();
      
      if (error) {
        console.error("Erro ao atualizar posto de atendimento:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("Não foi possível atualizar o posto de atendimento");
      }
      
      const updated = data[0] as ServiceLocation;
      console.log("Posto de atendimento atualizado com sucesso:", updated);
      
      // Atualizar na lista local
      const index = serviceLocations.findIndex(loc => loc.id === locationId);
      if (index !== -1) {
        serviceLocations[index] = updated;
      }
      
      return updated;
    } catch (error) {
      console.error("Erro ao atualizar posto de atendimento:", error);
      throw error;
    }
  },
  
  // Deletar um posto de atendimento
  deleteServiceLocation: async (id: string): Promise<void> => {
    console.log("Deletando posto de atendimento:", id);
    
    try {
      const { error } = await supabaseAdmin
        .from('service_locations')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Erro ao deletar posto de atendimento:", error);
        throw error;
      }
      
      console.log("Posto de atendimento deletado com sucesso");
      
      // Remover o posto da lista local
      const index = serviceLocations.findIndex(loc => loc.id === id);
      if (index !== -1) {
        serviceLocations.splice(index, 1);
      }
    } catch (error) {
      console.error("Erro ao deletar posto de atendimento:", error);
      throw error;
    }
  },
  
  // Users
  getUsers: async (): Promise<User[]> => {
    return users.map(user => ({
      ...user,
      password: '******' // Don't return actual passwords
    }));
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
    console.log(`Buscando agendamentos do operador ${operatorId}`);
    
    try {
      // Primeiro, buscar do Supabase para garantir dados atualizados - sem filtro de status
      const { data: supabaseAppointments, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('operatorId', operatorId);
      
      if (error) {
        console.error('Erro ao buscar agendamentos do operador do Supabase:', error);
        console.log('Usando dados locais como fallback');
        
        // Se falhou, usar dados locais - buscar todos os agendamentos do operador
        const localAppointments = appointments.filter(a => a.operatorId === operatorId);
        
        console.log(`Encontrados ${localAppointments.length} agendamentos locais para o operador`);
        return localAppointments.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
      }
      
      if (supabaseAppointments) {
        console.log(`Encontrados ${supabaseAppointments.length} agendamentos no Supabase para o operador`);
        
        // Processar os agendamentos do banco para garantir consistência
        const processedAppointments = supabaseAppointments.map(app => ({
          ...app,
          id: app.id || generateUUID(),
          status: app.status
        }));
        
        // Registrar os status encontrados para debug
        const statusCount: Record<string, number> = {};
        processedAppointments.forEach(app => {
          statusCount[app.status] = (statusCount[app.status] || 0) + 1;
        });
        console.log("Status dos agendamentos do operador:", statusCount);
        
        // Atualizar a lista local com os agendamentos do banco
        const supabaseIds = new Set(processedAppointments.map(app => app.id));
        
        // Remover da memória os agendamentos deste operador que estão no banco
        appointments = appointments.filter(app => 
          !(app.operatorId === operatorId && supabaseIds.has(app.id))
        );
        
        // Adicionar os agendamentos do banco à memória
        appointments.push(...processedAppointments);
        
        return processedAppointments.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
      }
      
      // Fallback: usar dados locais
      const localAppointments = appointments.filter(a => a.operatorId === operatorId);
      
      console.log(`Usando ${localAppointments.length} agendamentos locais como fallback`);
      return localAppointments.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
    } catch (error) {
      console.error("Erro ao buscar agendamentos do operador:", error);
      
      // Em caso de erro, retornar apenas dados locais
      const localAppointments = appointments.filter(a => a.operatorId === operatorId);
      
      return localAppointments.sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));
    }
  },
  
  
  // Get pending appointments
  getPendingAppointments: async (): Promise<Appointment[]> => {
    return appointments.filter(a => a.status === 'pending');
  },
  
  // Get unassigned appointments for task distribution
  getUnassignedAppointments: async (): Promise<Appointment[]> => {
    console.log("Buscando agendamentos não atribuídos");
    
    try {
      // Primeiro buscar do Supabase - priorizar dados do banco
      const { data: supabaseAppointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('status', 'pending');
      
      if (error) {
        console.error('Erro ao buscar agendamentos não atribuídos do Supabase:', error);
        // Usar apenas dados locais como fallback em caso de erro
        return appointments.filter(a => a.status === 'pending');
      }
      
      console.log('Resposta do Supabase - agendamentos pendentes:', supabaseAppointments);
      
      if (supabaseAppointments) {
        // Sempre usar os dados do Supabase quando disponíveis, mesmo que seja um array vazio
        // Isso garante que apenas agendamentos realmente no banco serão mostrados
        console.log(`Usando ${supabaseAppointments.length} agendamentos do banco de dados`);
        
        // Processar os agendamentos do banco para garantir consistência
        const processedAppointments = supabaseAppointments.map(app => ({
          ...app,
          id: app.id || generateUUID(),
          status: app.status || 'pending'
        }));
        
        return processedAppointments;
      }
      
      // Caso não tenha conseguido obter resposta do Supabase (improvável, mas possível)
      console.log('Não foi possível obter resposta do Supabase. Usando dados locais como fallback.');
      return appointments.filter(a => a.status === 'pending');
    } catch (error) {
      console.error('Erro inesperado ao buscar agendamentos não atribuídos:', error);
      return appointments.filter(a => a.status === 'pending');
    }
  },
  
  // Get all appointments in service (for master view)
  getAllInServiceAppointments: async (): Promise<Appointment[]> => {
    console.log("Buscando todos os agendamentos em atendimento");
    
    try {
      // Buscar do Supabase todos os agendamentos que estão atribuídos ou em atendimento
      const { data: supabaseAppointments, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .in('status', ['assigned', 'in_service', 'waiting']);
      
      if (error) {
        console.error('Erro ao buscar agendamentos em atendimento do Supabase:', error);
        // Usar apenas dados locais como fallback em caso de erro
        return appointments.filter(a => 
          ['assigned', 'in_service', 'waiting'].includes(a.status)
        );
      }
      
      console.log('Resposta do Supabase - agendamentos em atendimento:', supabaseAppointments?.length || 0);
      
      if (supabaseAppointments) {
        // Processar os agendamentos do banco para garantir consistência
        const processedAppointments = supabaseAppointments.map(app => ({
          ...app,
          id: app.id || generateUUID(),
          status: app.status
        }));
        
        return processedAppointments;
      }
      
      // Caso não tenha conseguido obter resposta do Supabase
      console.log('Não foi possível obter resposta do Supabase. Usando dados locais como fallback.');
      return appointments.filter(a => 
        ['assigned', 'in_service', 'waiting'].includes(a.status)
      );
    } catch (error) {
      console.error('Erro inesperado ao buscar agendamentos em atendimento:', error);
      return appointments.filter(a => 
        ['assigned', 'in_service', 'waiting'].includes(a.status)
      );
    }
  },
  
  // Get stats for dashboard
  getStats: async (userId?: string, userRole?: string) => {
    try {
      console.log("Buscando estatísticas do banco de dados...", { userId, userRole });
      
      // Buscar todos os agendamentos do Supabase
      let supabaseAppointments;
      
      if (userRole === 'operator' && userId) {
        console.log(`Buscando estatísticas específicas para o operador ${userId}`);
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('operatorId', userId);
          
        if (error) {
          console.error("Erro ao buscar agendamentos do operador no Supabase:", error);
          console.log("Usando dados locais como fallback para estatísticas do operador");
          // Fallback para dados locais filtrados pelo operador
          return {
            totalAppointments: appointments.filter(a => a.operatorId === userId).length,
            byStatus: {
              pending: appointments.filter(a => a.operatorId === userId && a.status === 'pending').length,
              waiting: appointments.filter(a => a.operatorId === userId && a.status === 'waiting').length,
              assigned: appointments.filter(a => a.operatorId === userId && a.status === 'assigned').length,
              in_service: appointments.filter(a => a.operatorId === userId && a.status === 'in_service').length,
              completed: appointments.filter(a => a.operatorId === userId && a.status === 'completed').length,
              cancelled: appointments.filter(a => a.operatorId === userId && a.status === 'cancelled').length
            },
            operatorStats: true
          };
        }
        
        supabaseAppointments = data || [];
        console.log(`Encontrados ${supabaseAppointments.length} agendamentos do operador no banco`);
        
        // Calcular estatísticas somente para o operador
        const totalAppointments = supabaseAppointments.length;
        
        // Contagem por status
        const pendingCount = supabaseAppointments.filter(a => a.status === 'pending').length;
        const waitingCount = supabaseAppointments.filter(a => a.status === 'waiting').length;
        const assignedCount = supabaseAppointments.filter(a => a.status === 'assigned').length;
        const inServiceCount = supabaseAppointments.filter(a => a.status === 'in_service').length;
        const completedCount = supabaseAppointments.filter(a => a.status === 'completed').length;
        const cancelledCount = supabaseAppointments.filter(a => a.status === 'cancelled').length;
        
        // Agendamentos em progresso (combinação de vários status)
        const inProgressCount = waitingCount + assignedCount + inServiceCount;
        
        return {
          totalAppointments,
          byStatus: {
            pending: pendingCount, 
            waiting: waitingCount,
            assigned: assignedCount,
            in_service: inServiceCount,
            completed: completedCount,
            cancelled: cancelledCount,
            // Para compatibilidade com o dashboard atual
            inProgress: inProgressCount
          },
          operatorStats: true
        };
      }
      
      // Para outros tipos de usuário, buscar todos os dados
      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*');
      
      if (appointmentsError) {
        console.error("Erro ao buscar agendamentos do Supabase:", appointmentsError);
        console.log("Usando dados locais como fallback para estatísticas");
        return getLocalStats(); // Fallback para estatísticas locais
      }
      
      supabaseAppointments = allAppointments || [];
      
      // Buscar todos os postos de atendimento do Supabase
      const { data: supabaseLocations, error: locationsError } = await supabase
        .from('service_locations')
        .select('*');
      
      if (locationsError) {
        console.error("Erro ao buscar postos do Supabase:", locationsError);
        console.log("Usando dados locais como fallback para estatísticas");
        return getLocalStats(); // Fallback para estatísticas locais
      }
      
      // Variável para armazenar os operadores
      let supabaseUsers = [];
      let byOperator = {};
      
      try {
        // Buscar todos os operadores do Supabase - em bloco try/catch separado para continuar mesmo se falhar
        console.log("Tentando buscar operadores do Supabase...");
        const { data: operatorsData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'operator');
        
        if (usersError) {
          console.error("Erro ao buscar operadores do Supabase:", usersError);
          console.log("Avançando sem os dados de operadores devido a erro de permissão");
          
          // Criar estatísticas de operadores com base nos IDs presentes nos agendamentos
          const operatorIds = [...new Set(supabaseAppointments
            .filter(a => a.operatorId)
            .map(a => a.operatorId))];
            
          console.log(`Reconstruindo dados de ${operatorIds.length} operadores a partir dos IDs nos agendamentos`);
          
          byOperator = operatorIds.reduce((acc, opId) => {
            acc[opId] = supabaseAppointments.filter(a => a.operatorId === opId).length;
            return acc;
          }, {});
        } else {
          console.log(`Encontrados ${operatorsData?.length || 0} operadores no Supabase`);
          supabaseUsers = operatorsData || [];
          
          // Estatísticas por operador (se houver dados de usuários)
          byOperator = supabaseUsers.reduce((acc, operator) => {
            acc[operator.name || operator.id] = supabaseAppointments.filter(a => a.operatorId === operator.id).length;
            return acc;
          }, {});
        }
      } catch (operatorError) {
        console.error("Erro ao processar dados de operadores:", operatorError);
        
        // Usa uma abordagem alternativa para gerar estatísticas por operador
        const operatorIds = [...new Set(supabaseAppointments
          .filter(a => a.operatorId)
          .map(a => a.operatorId))];
          
        byOperator = operatorIds.reduce((acc, opId) => {
          acc[opId] = supabaseAppointments.filter(a => a.operatorId === opId).length;
          return acc;
        }, {});
      }
      
      console.log(`Dados obtidos do Supabase: ${supabaseAppointments.length} agendamentos, ${supabaseLocations.length} postos`);
      
      // Calcular estatísticas com base nos dados do banco
      const totalAppointments = supabaseAppointments.length;
      const pendingCount = supabaseAppointments.filter(a => a.status === 'pending').length;
      const inProgressCount = supabaseAppointments.filter(a => ['waiting', 'in_service', 'assigned'].includes(a.status)).length;
      const completedCount = supabaseAppointments.filter(a => a.status === 'completed').length;
      const cancelledCount = supabaseAppointments.filter(a => a.status === 'cancelled').length;
      
      // Estatísticas por cidade
      const byCity = supabaseLocations.reduce((acc, location) => {
      const city = location.city;
      if (!acc[city]) acc[city] = 0;
      
        const locAppointments = supabaseAppointments.filter(a => a.locationId === location.id).length;
      acc[city] += locAppointments;
      
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
    } catch (error) {
      console.error("Erro ao obter estatísticas do banco:", error);
      console.log("Usando dados locais como fallback devido a erro");
      return getLocalStats(); // Fallback para estatísticas locais em caso de erro
    }
  },
  
  logout: async (): Promise<void> => {
    try {
      console.log("Realizando logout via Supabase Auth");
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Erro ao fazer logout:", error);
        throw new Error(`Falha ao fazer logout: ${error.message}`);
      }
      
      console.log("Logout realizado com sucesso");
    } catch (error) {
      console.error("Erro durante o logout:", error);
      throw error;
    }
  },
  
  // Função para criar um posto de teste no banco
  insertTestServiceLocation: async (): Promise<ServiceLocation> => {
    console.log("Criando posto de teste no banco de dados");
    
    try {
      const testLocation: Omit<ServiceLocation, 'id'> = {
        name: "Posto de Teste " + new Date().toLocaleTimeString(),
        zipCode: "20000-000",
        street: "Av. Teste",
        number: String(Math.floor(Math.random() * 1000)),
        neighborhood: "Bairro Teste",
        city: "Rio de Janeiro",
        state: "RJ",
        complement: "Perto do ponto de referência"
      };
      
      // Usar o cliente admin para ter permissões adequadas
      const { data, error } = await supabaseAdmin
        .from('service_locations')
        .insert(testLocation)
        .select();
      
      if (error) {
        console.error("Erro ao criar posto de teste:", error);
        throw error;
      }
      
      console.log("Posto de teste criado com sucesso:", data[0]);
            
      const newLocation = data[0] as ServiceLocation;
      
      // Atualizar a lista local
      serviceLocations.push(newLocation);
      
      return newLocation;
    } catch (error) {
      console.error("Erro ao inserir posto de teste:", error);
      throw error;
    }
  },
  
  // Função para compatibilidade - AppointmentCard usa isso
  getServiceLocationById: async (id: string): Promise<ServiceLocation | null> => {
    console.log("Chamada para obter location pelo ID:", id);
    return api.getServiceLocation(id);
  },
  
  // Função de alias para createServiceLocation
  addServiceLocation: async (location: Omit<ServiceLocation, 'id'>): Promise<ServiceLocation> => {
    return api.createServiceLocation(location);
  },
  
  // Função para inativar um usuário
  toggleUserActiveStatus: async (userId: string, isActive: boolean): Promise<User> => {
    console.log(`${isActive ? 'Ativando' : 'Inativando'} usuário com ID ${userId}`);
    
    try {
      // Verificar se o usuário existe
      const user = await api.getUserById(userId);
      
      if (!user) {
        throw new Error(`Usuário com ID ${userId} não encontrado`);
      }
      
      // Atualizar o status do usuário no Supabase
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive }) // Nome da coluna no banco é is_active
        .eq('id', userId)
        .select('*')
        .single();
        
      if (error) {
        console.error(`Erro ao ${isActive ? 'ativar' : 'inativar'} usuário no Supabase:`, error);
        
        // Se falhar no Supabase, atualizar apenas localmente
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          users[userIndex].isActive = isActive;
          console.log(`Usuário atualizado localmente: ${users[userIndex].name}, isActive: ${isActive}`);
          return users[userIndex];
        } else {
          throw new Error(`Usuário não encontrado localmente`);
        }
      }
      
      // Converter a resposta do banco para o formato da aplicação
      const updatedUser = {
        ...fromDbUser(data as DbUser),
        isActive: isActive // Garantir que isActive esteja definido corretamente
      };
      
      // Atualizar o usuário na lista local
      const userIndex = users.findIndex(u => u.id === userId);
      if (userIndex >= 0) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
      }
      
      console.log(`Usuário ${isActive ? 'ativado' : 'inativado'} com sucesso:`, updatedUser.name);
      return updatedUser;
    } catch (error) {
      console.error(`Erro ao ${isActive ? 'ativar' : 'inativar'} usuário:`, error);
      throw error;
    }
  },
  
  // Função para inativar um usuário
  inactivateUser: async (userId: string): Promise<User> => {
    return api.toggleUserActiveStatus(userId, false);
  },
  
  // Função para ativar um usuário
  activateUser: async (userId: string): Promise<User> => {
    return api.toggleUserActiveStatus(userId, true);
  },
  
  // Obter usuário por ID
  getUserById: async (userId: string): Promise<User | null> => {
    try {
      console.log("Buscando usuário por ID:", userId);
      
      // Tentar buscar do Supabase primeiro
      const { data: supabaseUser, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Erro ao buscar usuário do Supabase:", error);
        console.log("Buscando usuário localmente como fallback");
        
        // Se falhar, buscar localmente
        const localUser = users.find(u => u.id === userId);
        return localUser || null;
      }
      
      if (supabaseUser) {
        console.log("Usuário encontrado no Supabase:", supabaseUser.name);
        console.log("Dados do usuário do banco:", supabaseUser);
        
        // Verificar se já temos esse usuário em memória local para manter a senha
        const localUser = users.find(u => u.id === userId);
        
        const user: User = {
          id: supabaseUser.id,
          name: supabaseUser.name || '',
          email: supabaseUser.email || '',
          password: localUser?.password || '******',
          cpf: supabaseUser.cpf || '',
          birthDate: supabaseUser.birthDate || '',
          whatsapp: supabaseUser.whatsapp || '',
          role: supabaseUser.role as UserRole,
          isActive: supabaseUser.is_active !== false // Garante que undefined ou null sejam tratados como true
        };
        
        console.log(`Usuário mapeado - isActive no banco:`, supabaseUser.is_active, "mapeado para:", user.isActive);
        
        return user;
      }
      
      // Se não encontrar no Supabase, buscar localmente
      console.log("Usuário não encontrado no Supabase, buscando localmente");
      const localUser = users.find(u => u.id === userId);
      return localUser || null;
    } catch (error) {
      console.error("Erro ao buscar usuário por ID:", error);
      
      // Em caso de erro, tentar buscar localmente
      const localUser = users.find(u => u.id === userId);
      return localUser || null;
    }
  },
  
  // Debug e sincronização de status de usuário
  debugAndFixUserStatus: async (): Promise<void> => {
    console.log("========== INICIANDO DEBUG DE STATUS DE USUÁRIOS ==========");
    
    try {
      // Buscar todos os usuários diretamente do Supabase
      const { data: supabaseUsers, error } = await supabaseAdmin
        .from('users')
        .select('*');
      
      if (error) {
        console.error("Erro ao buscar usuários:", error);
        return;
      }
      
      if (!supabaseUsers || supabaseUsers.length === 0) {
        console.log("Nenhum usuário encontrado no banco de dados");
        return;
      }
      
      console.log(`Encontrados ${supabaseUsers.length} usuários no banco de dados`);
      
      // Verificar e registrar o status de cada usuário
      for (const dbUser of supabaseUsers) {
        console.log(`Usuário ${dbUser.email}:`);
        console.log(`  - ID: ${dbUser.id}`);
        console.log(`  - Role: ${dbUser.role}`);
        console.log(`  - is_active no banco: ${dbUser.is_active === undefined ? 'undefined' : dbUser.is_active}`);
        
        // Verificar se o usuário existe na memória
        const memoryUser = users.find(u => u.id === dbUser.id);
        if (memoryUser) {
          console.log(`  - isActive na memória: ${memoryUser.isActive}`);
          
          // Corrigir o status na memória se necessário
          if (memoryUser.isActive !== (dbUser.is_active !== false)) {
            console.log(`  - Corrigindo status na memória de ${memoryUser.isActive} para ${dbUser.is_active !== false}`);
            memoryUser.isActive = dbUser.is_active !== false;
          }
        } else {
          console.log(`  - Usuário não encontrado na memória`);
        }
      }
      
      console.log("Correção de status concluída");
      
    } catch (err) {
      console.error("Erro durante o debug de status:", err);
    }
    
    console.log("========== DEBUG DE STATUS DE USUÁRIOS CONCLUÍDO ==========");
  },
};
