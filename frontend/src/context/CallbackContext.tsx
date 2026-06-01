import React, { createContext, useCallback, useContext, useState } from "react";

type Ctx = {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
};

const CallbackCtx = createContext<Ctx | null>(null);

export const CallbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  return <CallbackCtx.Provider value={{ open, openModal, closeModal }}>{children}</CallbackCtx.Provider>;
};

export const useCallbackModal = (): Ctx => {
  const v = useContext(CallbackCtx);
  if (!v) throw new Error("useCallbackModal must be used within CallbackProvider");
  return v;
};
