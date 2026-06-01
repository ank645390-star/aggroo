import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AuthUser, fetchMe, login as apiLogin, register as apiRegister, clearToken, setToken } from "../lib/auth-api";

/* =====================================================================
   AuthContext — глобальний стейт авторизації.
   - При монтуванні підтягує /auth/me якщо є токен.
   - login(email, password) / register({...}) оновлюють user.
   - logout() — чистить токен та user state.
   ===================================================================== */

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await fetchMe();
        if (!cancelled) setUser(u);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiLogin({ email, password });
    setToken(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(async (p: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    const r = await apiRegister(p);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, isAuthed: !!user, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = (): AuthCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within <AuthProvider>");
  return v;
};
