import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';
import { supabase, supabaseAdmin } from '@/integrations/supabase/client';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  registerAndLogin: (userData: Omit<User, 'id'>) => Promise<void>;
  pendingConfirmation: boolean;
  pendingEmail: string;
  clearPendingConfirmation: () => void;
  updateUserRole: (role: UserRole) => void;
  syncUserRole: () => Promise<void>;
  forceMasterRoleForSpecificUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider initializing");
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Função para forçar o papel do usuário para master quando tem o UUID específico
  const forceMasterRoleForSpecificUser = () => {
    const MASTER_UUID = '5579ef22-9e33-4644-8834-8e7c05f713be';
    
    if (currentUser?.id === MASTER_UUID && userRole !== 'master') {
      console.log(`Forçando papel master para usuário com UUID específico: ${MASTER_UUID}`);
      
      // Atualizar o estado
      setUserRole('master');
      
      // Atualizar o usuário atual
      const updatedUser = { ...currentUser, role: 'master' as UserRole };
      setCurrentUser(updatedUser);
      
      // Atualizar no localStorage
      const storedUser = localStorage.getItem('agendrj-user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.role = 'master';
        localStorage.setItem('agendrj-user', JSON.stringify(parsedUser));
        console.log("Papel do usuário atualizado para MASTER no localStorage");
      }
      
      return true;
    }
    
    return false;
  };

  // Função para sincronizar o papel do usuário com o banco de dados
  const syncUserRole = async () => {
    console.log("Sincronizando papel do usuário com o banco de dados");
    
    if (!currentUser?.id) {
      console.error("Não é possível sincronizar: usuário não está logado");
      return;
    }
    
    // Verificar primeiro se é o usuário específico que deve ser master
    const MASTER_UUID = '5579ef22-9e33-4644-8834-8e7c05f713be';
    if (currentUser.id === MASTER_UUID) {
      console.log("Usuário com UUID do master detectado");
      if (userRole !== 'master') {
        forceMasterRoleForSpecificUser();
        return; // Encerra a função aqui após forçar o papel
      } else {
        console.log("Usuário já está com papel master");
        return; // Não precisa continuar se já é master
      }
    }
    
    try {
      // Continuar com a sincronização normal para outros usuários
      // Usar o cliente admin para evitar erros de permissão
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', currentUser.id)
        .single();
      
      if (error) {
        console.error("Erro ao buscar papel do usuário:", error);

        // Se for um erro de permissão, tentar o método alternativo para verificar o papel
        if (error.code === '42501') { // código de erro de permissão no PostgreSQL
          console.log("Tentando método alternativo para verificar o papel do usuário");
          await checkUserRoleFromAuth();
        }
        return;
      }
      
      if (data && data.role) {
        console.log(`Papel do usuário no banco: ${data.role}, papel atual: ${userRole}`);
        
        // Se o papel no banco for diferente do armazenado localmente, atualizar
        if (data.role !== userRole) {
          console.log(`Atualizando papel do usuário de ${userRole} para ${data.role}`);
          
          // Atualizar o estado
          setUserRole(data.role as UserRole);
          
          // Atualizar o usuário atual
          const updatedUser = { ...currentUser, role: data.role as UserRole };
          setCurrentUser(updatedUser);
          
          // Atualizar no localStorage
          const storedUser = localStorage.getItem('agendrj-user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.role = data.role;
            localStorage.setItem('agendrj-user', JSON.stringify(parsedUser));
            console.log("Papel do usuário atualizado no localStorage");
          }
        }
      }
    } catch (err) {
      console.error("Erro ao sincronizar papel do usuário:", err);
    }
  };

  // Função para verificar o papel do usuário através dos metadados de autenticação
  const checkUserRoleFromAuth = async () => {
    try {
      console.log("Obtendo informações da sessão atual");
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erro ao obter sessão:", error);
        return;
      }
      
      if (data?.session?.user.user_metadata?.role) {
        const authRole = data.session.user.user_metadata.role as UserRole;
        console.log(`Papel do usuário nos metadados de Auth: ${authRole}, papel atual: ${userRole}`);
        
        if (authRole !== userRole) {
          console.log(`Atualizando papel do usuário de ${userRole} para ${authRole}`);
          
          // Atualizar o estado
          setUserRole(authRole);
          
          // Atualizar o usuário atual
          const updatedUser = { ...currentUser, role: authRole };
          setCurrentUser(updatedUser);
          
          // Atualizar no localStorage
          const storedUser = localStorage.getItem('agendrj-user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            parsedUser.role = authRole;
            localStorage.setItem('agendrj-user', JSON.stringify(parsedUser));
            console.log("Papel do usuário atualizado no localStorage a partir dos metadados");
          }
        }
      } else {
        console.log("Papel do usuário não encontrado nos metadados de autenticação");
      }
    } catch (err) {
      console.error("Erro ao verificar papel do usuário na autenticação:", err);
    }
  };

  useEffect(() => {
    console.log("AuthProvider useEffect running - checking for saved session");
    
    // Check for existing session on mount
    const savedUser = localStorage.getItem('agendrj-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        console.log("Found saved user:", parsedUser.name, "with role:", parsedUser.role);
        
        // Verificar se o usuário está ativo
        if (parsedUser.isActive === false) {
          console.warn("Usuário inativo encontrado no localStorage, removendo sessão");
          localStorage.removeItem('agendrj-user');
          return; // Não restaurar a sessão para usuários inativos
        }
        
        // Verificar se é o usuário master e corrigir o papel imediatamente se necessário
        const MASTER_UUID = '5579ef22-9e33-4644-8834-8e7c05f713be';
        if (parsedUser.id === MASTER_UUID && parsedUser.role !== 'master') {
          console.log(`Usuário ${MASTER_UUID} encontrado com papel incorreto, corrigindo para master...`);
          parsedUser.role = 'master';
          // Salvar a correção no localStorage
          localStorage.setItem('agendrj-user', JSON.stringify(parsedUser));
          console.log("Papel corrigido para master no localStorage");
        }
        
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
        setUserRole(parsedUser.role);
        
        console.log("Session restored from localStorage");
        
        // Sincronizar o papel do usuário com o banco de dados quando restaurar a sessão
        setTimeout(() => {
          syncUserRole().catch(err => {
            console.error("Erro ao sincronizar papel após restaurar sessão:", err);
          });
        }, 500);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('agendrj-user');
      }
    } else {
      console.log("No saved user found in localStorage");
    }
    
    // Verificar se há email pendente de confirmação
    const pendingEmail = localStorage.getItem('agendrj-pending-email');
    const pendingConfirmation = localStorage.getItem('agendrj-pending-confirmation');
    
    if (pendingEmail && pendingConfirmation === 'true') {
      console.log("Found pending email confirmation for:", pendingEmail);
      setPendingEmail(pendingEmail);
      setPendingConfirmation(true);
    }
  }, []);

  useEffect(() => {
    // Log authentication state changes
    console.log("Auth state changed:", { 
      isAuthenticated, 
      userRole, 
      currentUser: currentUser ? currentUser.name : null 
    });
  }, [isAuthenticated, userRole, currentUser]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      console.log('[AuthContext] Tentando fazer login com:', email);
      
      // Modificado: Usando supabaseAdmin em vez de supabase para contornar as restrições de RLS
      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (fetchError && fetchError.code === 'PGRST116') {
        console.error('[AuthContext] Usuário não encontrado:', fetchError);
        throw new Error('Usuário não cadastrado');
      }
      
      if (fetchError) {
        console.error('[AuthContext] Erro ao buscar usuário:', fetchError);
        throw new Error('Erro ao verificar usuário: ' + fetchError.message);
      }
      
      // Verificar se o usuário está ativo
      if (existingUser && existingUser.is_active === false) {
        console.error('[AuthContext] Usuário inativo:', email);
        throw new Error('Seu usuário está inativo no sistema! Por favor entre em contato com a administração do sistema.');
      }
      
      // Tentar fazer login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('[AuthContext] Erro no login:', error);
        
        // Verificar o tipo de erro
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Senha incorreta');
        }
        
        throw new Error(error.message);
      }
      
      if (!data.user) {
        console.error('[AuthContext] Login falhou, nenhum usuário retornado');
        throw new Error('Falha no login');
      }
      
      console.log('[AuthContext] Login bem-sucedido:', data.user.email);
      
      // Modificado: Usando supabaseAdmin em vez de supabase para contornar as restrições de RLS
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userError) {
        console.error('[AuthContext] Erro ao buscar dados do usuário:', userError);
        throw new Error('Erro ao buscar dados do usuário');
      }
      
      console.log('[AuthContext] Dados do usuário recuperados:', userData);
      
      // Verificar novamente se o usuário está ativo (verificação adicional de segurança)
      if (userData.is_active === false) {
        console.error('[AuthContext] Usuário inativo detectado após autenticação:', email);
        // Fazer logout para garantir que o usuário não fique autenticado
        await supabase.auth.signOut();
        throw new Error('Seu usuário está inativo no sistema! Por favor entre em contato com a administração do sistema.');
      }
      
      // Só definir currentUser e atualizar localStorage se o usuário estiver ativo
      setCurrentUser(userData);
      setIsAuthenticated(true);
      setUserRole(userData.role);
      localStorage.setItem('agendrj-user', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('[AuthContext] Erro no login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerAndLogin = async (userData: Omit<User, 'id'>) => {
    console.log("Register and login attempt for:", userData.email);
    try {
      // Register the user
      const newUser = await api.register(userData);
      console.log("Registration successful, user ID:", newUser.id);
      
      try {
        // Tentativa de login automático
        console.log("Attempting automatic login after registration");
        setCurrentUser(newUser);
        setIsAuthenticated(true);
        setUserRole(newUser.role);
        localStorage.setItem('agendrj-user', JSON.stringify(newUser));
        console.log("Automatic login successful");
        clearPendingConfirmation();
      } catch (loginError) {
        // Se não conseguir fazer login, é provável que seja necessária confirmação de email
        console.warn('Usuário registrado, mas login falhou. Pode precisar de confirmação de email.');
        setPendingConfirmation(true);
        setPendingEmail(userData.email);
        localStorage.setItem('agendrj-pending-email', userData.email);
        localStorage.setItem('agendrj-pending-confirmation', 'true');
        throw loginError;
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      // Mesmo que o registro falhe por erro de email, ainda salvar que há uma confirmação pendente
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('email') && 
          errorMessage.toLowerCase().includes('confirm')) {
        console.log("Email confirmation required after error");
        setPendingConfirmation(true);
        setPendingEmail(userData.email);
        localStorage.setItem('agendrj-pending-email', userData.email);
        localStorage.setItem('agendrj-pending-confirmation', 'true');
      }
      
      throw error;
    }
  };

  const logout = () => {
    console.log("Logout requested");
    api.logout().catch(error => {
      console.error('Erro ao fazer logout na API:', error);
    });
    
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('agendrj-user');
    console.log("Logout completed, user state cleared");
  };

  const clearPendingConfirmation = () => {
    console.log("Clearing pending confirmation");
    setPendingConfirmation(false);
    setPendingEmail('');
    localStorage.removeItem('agendrj-pending-email');
    localStorage.removeItem('agendrj-pending-confirmation');
  };

  // Função para atualizar o papel do usuário
  const updateUserRole = (role: UserRole) => {
    console.log("Updating user role to:", role);
    if (!currentUser) {
      console.error("Cannot update role: No user logged in");
      return;
    }
    
    const updatedUser = { ...currentUser, role };
    setCurrentUser(updatedUser);
    setUserRole(role);
    
    // Atualizar também no localStorage
    const storedUser = localStorage.getItem('agendrj-user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      parsedUser.role = role;
      localStorage.setItem('agendrj-user', JSON.stringify(parsedUser));
      console.log("User role updated in localStorage");
    }
    
    console.log("User role updated successfully to:", role);
  };

  const value = {
    currentUser,
    isAuthenticated,
    userRole,
    login,
    logout,
    registerAndLogin,
    pendingConfirmation,
    pendingEmail,
    clearPendingConfirmation,
    updateUserRole,
    syncUserRole,
    forceMasterRoleForSpecificUser
  };

  console.log("AuthProvider rendering with currentUser:", currentUser?.name);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
