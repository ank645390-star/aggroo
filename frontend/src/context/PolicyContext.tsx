import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchAllPolicies, type Policy, type PolicyType } from "../lib/policies-api";

/* =====================================================================
   PolicyContext — глобальний доступ до 3-х сайтових політик
   (cookie / privacy / terms) + модалка перегляду конкретної політики.

   API:
     • policies        — масив з 3-х елементів (defaults поки тягнеться)
     • policyByType(t) — Policy | undefined
     • openPolicy(t)   — відкрити модальне вікно з політикою type=t
     • closePolicy()   — закрити модалку
     • activeType      — який тип політики зараз відкритий (або null)
     • reload()        — перетягнути з бекенду (після оновлення в адмінці)
   ===================================================================== */

export type PolicyContextValue = {
  policies: Policy[];
  loaded: boolean;
  policyByType: (type: PolicyType) => Policy | undefined;
  activeType: PolicyType | null;
  openPolicy: (type: PolicyType) => void;
  closePolicy: () => void;
  reload: () => Promise<void>;
};

const PolicyContext = createContext<PolicyContextValue | null>(null);

const FALLBACK_POLICIES: Policy[] = [
  { type: "cookie",  button_label: "Cookie Policy",   title: "Політика використання cookie", html_content: "" },
  { type: "privacy", button_label: "Privacy Policy",  title: "Політика конфіденційності",    html_content: "" },
  { type: "terms",   button_label: "Terms of Use",    title: "Умови користування сайтом",    html_content: "" },
];

export const PolicyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [policies, setPolicies] = useState<Policy[]>(FALLBACK_POLICIES);
  const [loaded, setLoaded] = useState(false);
  const [activeType, setActiveType] = useState<PolicyType | null>(null);

  const reload = useCallback(async () => {
    try {
      const items = await fetchAllPolicies();
      if (items && items.length > 0) {
        setPolicies(items);
      }
    } catch {
      /* keep fallback */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const policyByType = useCallback(
    (type: PolicyType) => policies.find((p) => p.type === type),
    [policies],
  );

  const openPolicy = useCallback((type: PolicyType) => {
    setActiveType(type);
  }, []);

  const closePolicy = useCallback(() => {
    setActiveType(null);
  }, []);

  const value = useMemo<PolicyContextValue>(
    () => ({ policies, loaded, policyByType, activeType, openPolicy, closePolicy, reload }),
    [policies, loaded, policyByType, activeType, openPolicy, closePolicy, reload],
  );

  return <PolicyContext.Provider value={value}>{children}</PolicyContext.Provider>;
};

export function usePolicies(): PolicyContextValue {
  const ctx = useContext(PolicyContext);
  if (!ctx) throw new Error("usePolicies must be used inside <PolicyProvider>");
  return ctx;
}
