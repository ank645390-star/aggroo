import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";

/**
 * Cart Context — single source of truth for the shopping cart.
 *
 * Server-backed persistence:
 *   - On first mount we generate (or read from localStorage) a stable
 *     `session_id` UUID that uniquely identifies this browser-device.
 *   - All mutations call the FastAPI backend (`/api/cart/{session_id}/...`).
 *   - Backend responses are the source of truth (count + total are recomputed
 *     server-side, so we never drift).
 *   - We keep an in-memory snapshot mirrored to localStorage for instant
 *     paint on subsequent loads while the network request is in flight.
 */

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  category?: string;
  volume?: string;
  price: number;
  quantity: number;
  image: string;
};

type CartResponse = {
  session_id: string;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    category?: string | null;
    volume?: string | null;
    price: number;
    quantity: number;
    image: string;
  }>;
  count: number;
  total: number;
  updated_at: string;
};

const STORAGE_KEY_ITEMS = "tamis-agro-cart-v1";
const STORAGE_KEY_SESSION = "tamis-agro-cart-session-v1";

/* ---------------- backend wiring ---------------- */
declare const process: { env: Record<string, string | undefined> };
const BACKEND_URL =
  (typeof process !== "undefined" && process.env.REACT_APP_BACKEND_URL) || "";
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 15000,
});

function newSessionId(): string {
  // RFC4122 v4 — fall back to simple random if crypto is unavailable
  const cryptoObj =
    typeof window !== "undefined" ? (window as any).crypto : undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY_SESSION);
    if (existing) return existing;
    const fresh = newSessionId();
    window.localStorage.setItem(STORAGE_KEY_SESSION, fresh);
    return fresh;
  } catch {
    return newSessionId();
  }
}

function normalizeItems(raw: CartResponse["items"]): CartItem[] {
  return raw.map((it) => ({
    id: it.id,
    productId: it.productId,
    name: it.name,
    category: it.category ?? undefined,
    volume: it.volume ?? undefined,
    price: Number(it.price),
    quantity: Number(it.quantity),
    image: it.image,
  }));
}

/* ---------------- Context shape ---------------- */
type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  count: number;
  total: number;
  loading: boolean;
  sessionId: string;

  addItem: (
    item: Omit<CartItem, "quantity"> & { quantity?: number }
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  increment: (id: string) => Promise<void>;
  decrement: (id: string) => Promise<void>;
  setQuantity: (id: string, qty: number) => Promise<void>;
  clear: () => Promise<void>;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_ITEMS);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* corrupt cache — ignore */
    }
    return [];
  });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionIdRef = useRef<string>(ensureSessionId());

  /* ----- persist items snapshot to localStorage on every change ----- */
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch {
      /* quota — ignore */
    }
  }, [items]);

  /* ----- lock background scroll while drawer is open ----- */
  useEffect(() => {
    const original = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  /* ----- on mount: pull the real cart from the server ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get<CartResponse>(
          `/cart/${sessionIdRef.current}`
        );
        if (!cancelled) setItems(normalizeItems(data.items));
      } catch (err) {
        // network down → keep localStorage snapshot
        console.warn("[cart] failed to fetch from server, using cache", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----- mutators (optimistic + server reconciliation) ----- */
  const applyResponse = useCallback((data: CartResponse) => {
    setItems(normalizeItems(data.items));
  }, []);

  const addItem = useCallback(
    async (payload: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      const qty = payload.quantity ?? 1;
      // ---- optimistic update ----
      setItems((prev) => {
        const existing = prev.find((i) => i.id === payload.id);
        if (existing) {
          return prev.map((i) =>
            i.id === payload.id ? { ...i, quantity: i.quantity + qty } : i
          );
        }
        return [...prev, { ...payload, quantity: qty } as CartItem];
      });

      try {
        const { data } = await api.post<CartResponse>(
          `/cart/${sessionIdRef.current}/items`,
          {
            id: payload.id,
            productId: payload.productId,
            name: payload.name,
            category: payload.category ?? null,
            volume: payload.volume ?? null,
            price: payload.price,
            quantity: qty,
            image: payload.image,
          }
        );
        applyResponse(data);
      } catch (err) {
        console.error("[cart] add failed", err);
      }
    },
    [applyResponse]
  );

  const setQuantity = useCallback(
    async (id: string, quantity: number) => {
      const qty = Math.max(0, Math.floor(quantity));
      // optimistic
      setItems((prev) =>
        qty <= 0
          ? prev.filter((i) => i.id !== id)
          : prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
      );
      try {
        const { data } = await api.patch<CartResponse>(
          `/cart/${sessionIdRef.current}/items/${encodeURIComponent(id)}`,
          { quantity: qty }
        );
        applyResponse(data);
      } catch (err) {
        console.error("[cart] update qty failed", err);
      }
    },
    [applyResponse]
  );

  const increment = useCallback(
    async (id: string) => {
      const current = items.find((i) => i.id === id);
      const next = current ? current.quantity + 1 : 1;
      await setQuantity(id, next);
    },
    [items, setQuantity]
  );

  const decrement = useCallback(
    async (id: string) => {
      const current = items.find((i) => i.id === id);
      const next = current ? Math.max(0, current.quantity - 1) : 0;
      await setQuantity(id, next);
    },
    [items, setQuantity]
  );

  const removeItem = useCallback(
    async (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      try {
        const { data } = await api.delete<CartResponse>(
          `/cart/${sessionIdRef.current}/items/${encodeURIComponent(id)}`
        );
        applyResponse(data);
      } catch (err) {
        console.error("[cart] remove failed", err);
      }
    },
    [applyResponse]
  );

  const clear = useCallback(async () => {
    setItems([]);
    try {
      const { data } = await api.delete<CartResponse>(
        `/cart/${sessionIdRef.current}`
      );
      applyResponse(data);
    } catch (err) {
      console.error("[cart] clear failed", err);
    }
  }, [applyResponse]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  const count = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items]
  );
  const total = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const value: CartContextValue = {
    items,
    isOpen,
    count,
    total,
    loading,
    sessionId: sessionIdRef.current,
    addItem,
    removeItem,
    increment,
    decrement,
    setQuantity,
    clear,
    openCart,
    closeCart,
    toggleCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside <CartProvider>");
  }
  return ctx;
};
