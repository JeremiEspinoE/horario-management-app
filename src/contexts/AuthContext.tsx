import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import axios from 'axios';

type Role = 'Docente' | 'Administrador' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  role: Role;
  accessToken: string | null;
  refreshToken: string | null;
  setRole: (role: Role) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<Role>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Carga estado de autenticación desde localStorage
    const storedRole = localStorage.getItem('role') as Role;
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedAccessToken && storedRole) {
      setIsAuthenticated(true);
      setRole(storedRole);
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8000/api/auth/token/', {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { access, refresh } = response.data;
      
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      setAccessToken(access);
      setRefreshToken(refresh);
      setIsAuthenticated(true);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Credenciales inválidas');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('role');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    setIsAuthenticated(false);
    setRole(null);
    setAccessToken(null);
    setRefreshToken(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      accessToken,
      refreshToken,
      setRole: (newRole) => {
        setRole(newRole);
        if (newRole) {
          localStorage.setItem('role', newRole);
        } else {
          localStorage.removeItem('role');
        }
      },
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};
