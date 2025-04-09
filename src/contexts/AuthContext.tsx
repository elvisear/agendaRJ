
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const savedUser = localStorage.getItem('agendrj-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        setCurrentUser(parsedUser);
        setIsAuthenticated(true);
        setUserRole(parsedUser.role);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('agendrj-user');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const user = await api.login(email, password);
      setCurrentUser(user);
      setIsAuthenticated(true);
      setUserRole(user.role);
      localStorage.setItem('agendrj-user', JSON.stringify(user));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const registerAndLogin = async (userData: Omit<User, 'id'>) => {
    try {
      // Register the user
      const newUser = await api.register(userData);
      
      // Automatically log them in
      setCurrentUser(newUser);
      setIsAuthenticated(true);
      setUserRole(newUser.role);
      localStorage.setItem('agendrj-user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('agendrj-user');
  };

  const value = {
    currentUser,
    isAuthenticated,
    userRole,
    login,
    logout,
    registerAndLogin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
