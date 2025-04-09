import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerAndLogin: (userData: Omit<User, 'id'>) => Promise<void>;
  pendingConfirmation: boolean;
  pendingEmail: string;
  clearPendingConfirmation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider initializing");
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<boolean>(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');

  useEffect(() => {
    console.log("AuthProvider useEffect running - checking for saved session");
    
    // Check for existing session on mount
    const savedUser = localStorage.getItem('agendrj-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        console.log("Found saved user:", parsedUser.name, "with role:", parsedUser.role);
        
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
        setUserRole(parsedUser.role);
        
        console.log("Session restored from localStorage");
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
    console.log("Login attempt for email:", email);
    try {
      const user = await api.login(email, password);
      console.log("Login successful for user:", user.name);
      
      // Salvar informações de autenticação
      setCurrentUser(user);
      setIsAuthenticated(true);
      setUserRole(user.role);
      
      // Garantir que o objeto do usuário tenha a senha para login offline
      const userToSave = {
        ...user,
        password: password // Armazenar a senha para permitir login offline
      };
      
      // Salvar em localStorage para persistência entre recarregamentos
      localStorage.setItem('agendrj-user', JSON.stringify(userToSave));
      
      console.log("User saved to localStorage and state updated");
      
      // Limpar estado de pendência de confirmação para este email
      if (pendingEmail === email) {
        clearPendingConfirmation();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Verificar se o erro é de email não confirmado
      if (error.message?.includes('Email not confirmed') || 
          error.message?.includes('Email confirmation')) {
        console.log("Email requires confirmation:", email);
        // Armazenar informação de que o email está pendente de confirmação
        setPendingConfirmation(true);
        setPendingEmail(email);
        localStorage.setItem('agendrj-pending-email', email);
        localStorage.setItem('agendrj-pending-confirmation', 'true');
      }
      
      throw error;
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

  const value = {
    currentUser,
    isAuthenticated,
    userRole,
    login,
    logout,
    registerAndLogin,
    pendingConfirmation,
    pendingEmail,
    clearPendingConfirmation
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
