import React, { createContext, useCallback, useContext, useState } from "react";

type OpenOpts = { defaultSubject?: string };

type Ctx = {
  open: boolean;
  defaultSubject: string;
  openEmailModal: (opts?: OpenOpts) => void;
  closeEmailModal: () => void;
};

const EmailModalCtx = createContext<Ctx | null>(null);

export const EmailModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [open, setOpen] = useState(false);
  const [defaultSubject, setDefaultSubject] = useState("");

  const openEmailModal = useCallback((opts?: OpenOpts) => {
    setDefaultSubject(opts?.defaultSubject || "");
    setOpen(true);
  }, []);
  const closeEmailModal = useCallback(() => setOpen(false), []);

  return (
    <EmailModalCtx.Provider
      value={{ open, defaultSubject, openEmailModal, closeEmailModal }}
    >
      {children}
    </EmailModalCtx.Provider>
  );
};

export const useEmailModal = (): Ctx => {
  const v = useContext(EmailModalCtx);
  if (!v) throw new Error("useEmailModal must be used within EmailModalProvider");
  return v;
};
