import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

/* --------------------------------------------------------------------
   Stale-chunk auto-recovery.
   In dev (and after deploys), code-split chunks can be invalidated
   while a user has an old `bundle.js` reference. Navigation then
   triggers `ChunkLoadError` / "Unexpected token '<'" (when the dev
   server returns index.html for the missing .chunk.js).
   We catch the failure ONCE per session and hard-reload, so the user
   gets a fresh, consistent bundle instead of a red error overlay.
-------------------------------------------------------------------- */
const CHUNK_RELOAD_KEY = "__chunk_reloaded_at";
const isChunkError = (msg: unknown): boolean => {
  const s = String(msg ?? "");
  return (
    /ChunkLoadError/i.test(s) ||
    /Loading chunk [\w-]+ failed/i.test(s) ||
    /Loading CSS chunk [\w-]+ failed/i.test(s) ||
    (/Unexpected token '<'/.test(s) && /\.chunk\.(js|css)/i.test(s))
  );
};
const tryReload = () => {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
    // Avoid reload-loop: only reload if we haven't reloaded in the last 10s.
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
};
window.addEventListener("error", (e) => {
  if (isChunkError(e?.message) || isChunkError(e?.error?.message)) {
    tryReload();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const reason = (e as PromiseRejectionEvent).reason;
  if (
    isChunkError(reason?.message) ||
    isChunkError(reason?.name) ||
    isChunkError(reason)
  ) {
    tryReload();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
