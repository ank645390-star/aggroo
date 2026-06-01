import React, { createContext, useCallback, useContext, useState } from "react";

type Tab = "login" | "register";
type Ctx = {
  open: boolean;
  tab: Tab;
  openAuth: (tab?: Tab) => void;
  closeAuth: () => void;
  setTab: (t: Tab) => void;
};

const AuthModalCtx = createContext<Ctx | null>(null);

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("login");
  const openAuth = useCallback((t: Tab = "login") => { setTab(t); setOpen(true); }, []);
  const closeAuth = useCallback(() => setOpen(false), []);
  return (
    <AuthModalCtx.Provider value={{ open, tab, openAuth, closeAuth, setTab }}>
      {children}
    </AuthModalCtx.Provider>
  );
};

export const useAuthModal = (): Ctx => {
  const v = useContext(AuthModalCtx);
  if (!v) throw new Error("useAuthModal must be used within AuthModalProvider");
  return v;
};
