import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authedApi } from "../lib/auth-api";

export type ContactInfo = {
  phone_primary: string;
  phone_secondary: string;
  email: string;
  address: string;
  phone_primary_tel: string;
  phone_secondary_tel: string;
};

const DEFAULTS: ContactInfo = {
  phone_primary: "+380 (50) 937-56-57",
  phone_secondary: "+380 (67) 510-13-07",
  email: "tamisagro@gmail.com",
  address: "55200, м. Первомайськ, вул. Київська 135, Миколаївська область",
  phone_primary_tel: "+380509375657",
  phone_secondary_tel: "+380675101307",
};

type Ctx = {
  info: ContactInfo;
  refresh: () => Promise<void>;
  loading: boolean;
};

const ContactInfoContext = createContext<Ctx>({
  info: DEFAULTS,
  refresh: async () => {},
  loading: false,
});

export const ContactInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [info, setInfo] = useState<ContactInfo>(DEFAULTS);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = async () => {
    try {
      const { data } = await authedApi.get<ContactInfo>("/contact-info");
      if (data) {
        setInfo({
          phone_primary: data.phone_primary || DEFAULTS.phone_primary,
          phone_secondary: data.phone_secondary || DEFAULTS.phone_secondary,
          email: data.email || DEFAULTS.email,
          address: data.address || DEFAULTS.address,
          phone_primary_tel: data.phone_primary_tel || DEFAULTS.phone_primary_tel,
          phone_secondary_tel: data.phone_secondary_tel || DEFAULTS.phone_secondary_tel,
        });
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // Refetch on storage/sync (admin updates) every 5 min as safety
    const t = window.setInterval(refresh, 5 * 60 * 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<Ctx>(() => ({ info, refresh, loading }), [info, loading]);

  return (
    <ContactInfoContext.Provider value={value}>
      {children}
    </ContactInfoContext.Provider>
  );
};

export function useContactInfo(): Ctx {
  return useContext(ContactInfoContext);
}
