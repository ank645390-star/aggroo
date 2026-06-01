import React, { useEffect, useRef, useState } from "react";

/* =====================================================================
   GoogleSignInButton — рендерить офіційну Google Identity Services кнопку.
   - Динамічно завантажує https://accounts.google.com/gsi/client
   - Ініціалізує google.accounts.id з client_id з адмін-налаштувань.
   - При вході передає credential (id_token) у callback.

   REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
   ===================================================================== */

declare global {
  interface Window {
    google?: any;
    __googleGisLoaded?: boolean;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.__googleGisLoaded && window.google?.accounts?.id) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => { window.__googleGisLoaded = true; resolve(); };
    s.onerror = () => reject(new Error("GIS load failed"));
    document.head.appendChild(s);
  });
}

type Props = {
  clientId: string;
  onCredential: (credential: string) => void | Promise<void>;
  onError?: (err: Error) => void;
  width?: number;
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
};

const GoogleSignInButton: React.FC<Props> = ({ clientId, onCredential, onError, width = 400, text = "continue_with" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) { setErr("Google client_id не налаштовано"); return; }
    loadGoogleScript()
      .then(() => {
        if (cancelled || !ref.current) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              try { await onCredential(response.credential); }
              catch (e: any) { onError?.(e instanceof Error ? e : new Error(String(e))); }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            ux_mode: "popup",
          });
          window.google.accounts.id.renderButton(ref.current, {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text,
            logo_alignment: "left",
            width,
          });
          setReady(true);
        } catch (e: any) {
          setErr("Не вдалося ініціалізувати Google вхід");
          onError?.(e);
        }
      })
      .catch((e) => { setErr("Не вдалося завантажити Google Identity Services"); onError?.(e); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  if (err) return <div style={{ fontSize: 13, color: "#c14a3c", padding: "8px 0" }}>{err}</div>;
  return (
    <div
      ref={ref}
      data-testid="google-signin-btn"
      style={{ minHeight: 44, display: "flex", justifyContent: "center", opacity: ready ? 1 : 0.6 }}
    />
  );
};

export default GoogleSignInButton;
