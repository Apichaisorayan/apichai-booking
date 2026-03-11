import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tabStorage } from '../lib/tabSession';
import { authApi } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลด session ที่บันทึกไว้ (ใช้ mock เสมอ)
  useEffect(() => {
    const savedToken = tabStorage.getItem('token');
    const savedUser = tabStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
    tabStorage.cleanup();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call real API
      const response = await authApi.login({ email, password });

      if (!response.success || !response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      const userData = {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
      };

      setUser(userData);
      setToken(response.token);

      // Store in multiple storages for persistence
      tabStorage.setItem('token', response.token);
      tabStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('token', response.token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('auth_token', response.token);

    } catch (err: any) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authApi.register({ name, email, password, role });

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'ลงทะเบียนไม่สำเร็จ');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    tabStorage.removeItem('token');
    tabStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
