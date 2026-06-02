import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import { api, getAccessToken, setAccessToken, ACCESS_TOKEN_KEY } from '../api/client';

const STORAGE_KEY = 'surgical_training_user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (u: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? (JSON.parse(s) as User) : null;
  } catch {
    return null;
  }
}

export function mapTraineeToUser(row: {
  TraineeID: number;
  Name: string;
  Email: string;
  Role?: string | null;
  Specialty?: string | null;
  PriorSimulationExperience?: string | null;
  UnityUnrealExperience?: string | null;
}): User {
  return {
    traineeId: row.TraineeID,
    name: row.Name,
    email: row.Email,
    role: row.Role === 'instructor' ? 'instructor' : 'trainee',
    specialty: row.Specialty ?? null,
    priorSimulationExperience: row.PriorSimulationExperience ?? null,
    unityUnrealExperience: row.UnityUnrealExperience ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(getAccessToken);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
  }, []);

  const login = useCallback((u: User, accessToken: string) => {
    setUser(u);
    setToken(accessToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setAccessToken(accessToken);
  }, []);

  useEffect(() => {
    const stored = readStoredUser();
    const t = getAccessToken();
    if (stored && !t) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken(null);
      return;
    }
    setUser(stored);
    setToken(t);
  }, []);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) return;
    void api
      .getMe()
      .then((row) => setUser(mapTraineeToUser(row)))
      .catch(() => {
        /* 401: fetchApi clears token + dispatches auth:unauthorized. Other errors: keep cached user. */
      });
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, [logout]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue) as User);
        } catch {
          setUser(null);
        }
      }
      if (e.key === STORAGE_KEY && e.newValue == null) setUser(null);
      if (e.key === ACCESS_TOKEN_KEY) {
        setToken(e.newValue);
        if (!e.newValue) setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
