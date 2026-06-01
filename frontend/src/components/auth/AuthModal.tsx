import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { isValidEmail, isValidUaPhone, progressiveFormatUaPhone, formatUaPhone, normalizeUaPhone } from "../../lib/profile-utils";
import { fetchAuthConfig, googleLogin, AuthPublicConfig } from "../../lib/google-auth-api";
import GoogleSignInButton from "./GoogleSignInButton";
import styles from "./AuthModal.module.css";

/* =====================================================================
   AuthModal — єдина модальна форма (центрована) на 2 вкладки:
   Увійти / Реєстрація + Google Sign-In вгорі.
   Рендериться через portal, щоб обійти transform:scale.
   ===================================================================== */

type Tab = "login" | "register";

const AuthModal: React.FC<{
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
}> = ({ open, onClose, initialTab = "login" }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [authCfg, setAuthCfg] = useState<AuthPublicConfig | null>(null);

  // login
  const [lEmail, setLEmail] = useState("");
  const [lPwd, setLPwd] = useState("");

  // register
  const [rEmail, setREmail] = useState("");
  const [rPwd, setRPwd] = useState("");
  const [rFirst, setRFirst] = useState("");
  const [rLast, setRLast] = useState("");
  const [rPhone, setRPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setError(null);
    // Fetch Google config on open (cached after first call)
    if (!authCfg) {
      fetchAuthConfig().then(setAuthCfg).catch(() => setAuthCfg({ google_client_id: "", google_enabled: false }));
    }
  }, [open, initialTab, authCfg]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onEsc);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onEsc); };
  }, [open, onClose]);

  if (!open) return null;

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(lEmail)) { setError("Некоректна пошта"); return; }
    if (lPwd.length < 6) { setError("Пароль мінімум 6 символів"); return; }
    setSubmitting(true);
    try { await login(lEmail.trim().toLowerCase(), lPwd); onClose(); }
    catch (err: any) { setError(err?.response?.data?.detail || "Не вдалося увійти"); }
    finally { setSubmitting(false); }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(rEmail)) { setError("Некоректна пошта"); return; }
    if (rPwd.length < 6) { setError("Пароль мінімум 6 символів"); return; }
    if (!rFirst.trim()) { setError("Вкажіть ім'я"); return; }
    if (!rLast.trim()) { setError("Вкажіть прізвище"); return; }
    if (rPhone && !isValidUaPhone(rPhone)) { setError("Некоректний номер"); return; }
    setSubmitting(true);
    try {
      await register({
        email: rEmail.trim().toLowerCase(),
        password: rPwd,
        firstName: rFirst.trim(),
        lastName: rLast.trim(),
        phone: rPhone ? formatUaPhone(normalizeUaPhone(rPhone) || "") : "",
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не вдалося зареєструватися");
    } finally { setSubmitting(false); }
  };

  const handleGoogleCredential = async (credential: string) => {
    setGoogleSubmitting(true);
    setError(null);
    try {
      await googleLogin(credential);
      // Force AuthContext to refetch — reload page is simplest reliable approach
      window.location.reload();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не вдалося увійти через Google");
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const showGoogle = authCfg?.google_enabled && !!authCfg?.google_client_id;

  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" data-testid="auth-modal">
        <button type="button" className={styles.close} onClick={onClose} aria-label="Закрити" data-testid="auth-close">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="#2C2C27" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>{tab === "login" ? "Вхід до акаунту" : "Створення акаунту"}</h2>
          <p className={styles.subtitle}>
            {tab === "login" ? "Увійдіть, щоб переглядати замовлення та керувати адресами." : "Зареєструйтеся, щоб зберігати свої адреси та замовлення."}
          </p>
        </div>

        {showGoogle && (
          <div className={styles.googleWrap}>
            <GoogleSignInButton
              clientId={authCfg!.google_client_id}
              onCredential={handleGoogleCredential}
              onError={(e) => setError("Google: " + (e?.message || "помилка"))}
              text={tab === "register" ? "signup_with" : "continue_with"}
            />
            {googleSubmitting && <div className={styles.googleHint}>Перевіряємо ваш Google-акаунт…</div>}
          </div>
        )}

        {showGoogle && (
          <div className={styles.divider}>
            <span>або через пошту</span>
          </div>
        )}

        <div className={styles.tabs} role="tablist">
          <button type="button" className={`${styles.tab} ${tab === "login" ? styles.tabActive : ""}`} onClick={() => { setTab("login"); setError(null); }} data-testid="auth-tab-login">Увійти</button>
          <button type="button" className={`${styles.tab} ${tab === "register" ? styles.tabActive : ""}`} onClick={() => { setTab("register"); setError(null); }} data-testid="auth-tab-register">Реєстрація</button>
        </div>

        {tab === "login" ? (
          <form className={styles.form} onSubmit={submitLogin}>
            <FormField label="Пошта" required value={lEmail} onChange={setLEmail} type="email" testId="auth-login-email" placeholder="you@example.com" />
            <FormField label="Пароль" required value={lPwd} onChange={setLPwd} type="password" testId="auth-login-password" placeholder="Мінімум 6 символів" />
            {error && <div className={styles.error} data-testid="auth-error">{error}</div>}
            <button type="submit" className={styles.submit} disabled={submitting} data-testid="auth-submit">{submitting ? "Вхід…" : "Увійти"}</button>
            <p className={styles.hint}>Немає акаунту? <button type="button" className={styles.link} onClick={() => setTab("register")}>Зареєструйтеся</button></p>
          </form>
        ) : (
          <form className={styles.form} onSubmit={submitRegister}>
            <div className={styles.grid2}>
              <FormField label="Прізвище" required value={rLast} onChange={setRLast} testId="auth-reg-last" placeholder="Петренко" />
              <FormField label="Ім'я" required value={rFirst} onChange={setRFirst} testId="auth-reg-first" placeholder="Іван" />
            </div>
            <FormField label="Пошта" required value={rEmail} onChange={setREmail} type="email" testId="auth-reg-email" placeholder="you@example.com" />
            <FormField label="Телефон" value={rPhone} onChange={(v) => setRPhone(progressiveFormatUaPhone(v))} type="tel" testId="auth-reg-phone" placeholder="+380 (XX) XXX XX XX" />
            <FormField label="Пароль" required value={rPwd} onChange={setRPwd} type="password" testId="auth-reg-password" placeholder="Мінімум 6 символів" />
            {error && <div className={styles.error} data-testid="auth-error">{error}</div>}
            <button type="submit" className={styles.submit} disabled={submitting} data-testid="auth-submit">{submitting ? "Створюємо…" : "Створити акаунт"}</button>
            <p className={styles.hint}>Вже є акаунт? <button type="button" className={styles.link} onClick={() => setTab("login")}>Увійдіть</button></p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

const FormField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; testId?: string; placeholder?: string;
}> = ({ label, value, onChange, type = "text", required, testId, placeholder }) => (
  <label className={styles.field}>
    <span className={styles.fieldLabel}>{label}{required && <span className={styles.req} aria-hidden="true"> *</span>}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles.input}
      placeholder={placeholder}
      data-testid={testId}
      aria-required={required ? "true" : undefined}
      autoComplete={type === "password" ? "current-password" : "off"}
    />
  </label>
);

export default AuthModal;
