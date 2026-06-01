import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/* =====================================================================
   UserDrawerContext
   ---------------------------------------------------------------------
   Мінімальний контекст для керування відкритим станом бокової панелі
   користувача (профільний drawer). Аналогічно до CartContext, але без
   персистності — профільні дані вже живуть у власному backend.

   При відкритті блокує скрол body, обробляє Escape для закриття.
   ===================================================================== */

type Ctx = {
  isOpen: boolean;
  openUserDrawer: () => void;
  closeUserDrawer: () => void;
  toggleUserDrawer: () => void;
};

const UserDrawerContext = createContext<Ctx | null>(null);

export const UserDrawerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const openUserDrawer = useCallback(() => setIsOpen(true), []);
  const closeUserDrawer = useCallback(() => setIsOpen(false), []);
  const toggleUserDrawer = useCallback(() => setIsOpen((v) => !v), []);

  // body scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [isOpen]);

  // Escape closes drawer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <UserDrawerContext.Provider
      value={{ isOpen, openUserDrawer, closeUserDrawer, toggleUserDrawer }}
    >
      {children}
    </UserDrawerContext.Provider>
  );
};

export const useUserDrawer = (): Ctx => {
  const ctx = useContext(UserDrawerContext);
  if (!ctx)
    throw new Error("useUserDrawer must be used within <UserDrawerProvider>");
  return ctx;
};
