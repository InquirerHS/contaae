import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiRequest, setAuthToken, queryClient } from "./queryClient";
import type { SafeUser } from "./types";

interface AuthState {
  user: SafeUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  birthDate: string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  // attempt to restore session from in-memory token
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (res.ok) {
          const u = await res.json();
          setUser(u);
        }
      } catch {
        /* no token yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setAuthToken(data.token);
    setUser(data.user);
    queryClient.invalidateQueries();
  };

  const register = async (data: RegisterData) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    setAuthToken(result.token);
    setUser(result.user);
    queryClient.invalidateQueries();
  };

  const refresh = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/me");
      if (res.ok) {
        const u = await res.json();
        setUser(u);
      }
    } catch {
      /* ignore */
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
