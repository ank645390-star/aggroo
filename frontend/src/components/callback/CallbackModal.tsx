import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useCallbackModal } from "../../context/CallbackContext";
import { usePolicies } from "../../context/PolicyContext";
import { submitCallback } from "../../lib/callback-api";
import { isValidUaPhone, progressiveFormatUaPhone, normalizeUaPhone, formatUaPhone } from "../../lib/profile-utils";
import styles from "./CallbackModal.module.css";

/* =====================================================================
   CallbackModal — «Замовити дзвінок». Поля: ім'я, телефон (обов.),
   коментар (опція), згода на обробку ПД. Надсилає POST /api/callbacks.
   Рендериться через portal — виходить за межі transform:scale вживаного в App.
   ===================================================================== */

const CallbackModal: React.FC = () => {
  const { open, closeModal } = useCallbackModal();
  const { openPolicy, policyByType } = usePolicies();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setPhone(""); setComment(""); setConsent(false);
      setError(null); setSuccess(false); setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, closeModal]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Вкажіть ваше ім'я"); return; }
    if (!isValidUaPhone(phone)) { setError("Некоректний номер телефону"); return; }
    if (!consent) { setError("Потрібна згода на обробку перс. даних"); return; }
    setSubmitting(true);
    try {
      const normalized = normalizeUaPhone(phone) || phone;
      await submitCallback({
        name: name.trim(),
        phone: formatUaPhone(normalized) || phone.trim(),
        comment: comment.trim() || undefined,
        consent: true,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Не вдалося надіслати. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={closeModal} role="presentation">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" data-testid="callback-modal">
        <button type="button" className={styles.close} onClick={closeModal} aria-label="Закрити" data-testid="callback-close">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="#2C2C27" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </button>

        {!success ? (
          <>
            <div className={styles.header}>
              <div className={styles.iconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21.97 18.33a2.5 2.5 0 0 1-2.5 2.5C9.95 20.83 3.17 14.05 3.17 4.53a2.5 2.5 0 0 1 2.5-2.5h2.5a1 1 0 0 1 1 .79l.95 4.27a1 1 0 0 1-.27.93l-1.7 1.7a14.5 14.5 0 0 0 6.13 6.13l1.7-1.7a1 1 0 0 1 .93-.27l4.27.95a1 1 0 0 1 .79 1v2.5Z" stroke="#1b4332" strokeWidth="1.6" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h2 className={styles.title}>Замовити дзвінок</h2>
                <p className={styles.subtitle}>Наш менеджер зв'яжеться з вами протягом 10 хвилин</p>
              </div>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Ім'я<span className={styles.req}> *</span></span>
                <input
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Іван"
                  data-testid="callback-name"
                  autoFocus
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Номер телефону<span className={styles.req}> *</span></span>
                <input
                  className={styles.input}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(progressiveFormatUaPhone(e.target.value))}
                  placeholder="+380 (XX) XXX XX XX"
                  data-testid="callback-phone"
                />
              </label>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>Коментар <span style={{color:'#93928c', fontWeight:400}}>(опціонально)</span></span>
                <textarea
                  className={styles.textarea}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Який продукт вас цікавить або зручний час для дзвінка"
                  data-testid="callback-comment"
                />
              </label>

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  data-testid="callback-consent"
                />
                <span>
                  Я даю згоду на обробку моїх персональних даних відповідно до{" "}
                  <button
                    type="button"
                    className={styles.consentLink}
                    onClick={(e) => { e.preventDefault(); openPolicy("privacy"); }}
                    data-testid="callback-consent-privacy-link"
                  >
                    {policyByType("privacy")?.button_label || "Privacy Policy"}
                  </button>
                  {" "}та{" "}
                  <button
                    type="button"
                    className={styles.consentLink}
                    onClick={(e) => { e.preventDefault(); openPolicy("terms"); }}
                    data-testid="callback-consent-terms-link"
                  >
                    {policyByType("terms")?.button_label || "Terms of Use"}
                  </button>
                </span>
              </label>

              {error && <div className={styles.error} data-testid="callback-error">{error}</div>}

              <button type="submit" className={styles.submit} disabled={submitting} data-testid="callback-submit">
                {submitting ? "Надсилаємо…" : (
                  <>
                    Оформити заявку
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.97 18.33a2.5 2.5 0 0 1-2.5 2.5C9.95 20.83 3.17 14.05 3.17 4.53a2.5 2.5 0 0 1 2.5-2.5h2.5a1 1 0 0 1 1 .79l.95 4.27a1 1 0 0 1-.27.93l-1.7 1.7a14.5 14.5 0 0 0 6.13 6.13l1.7-1.7a1 1 0 0 1 .93-.27l4.27.95a1 1 0 0 1 .79 1v2.5Z" stroke="#f9f7f2" strokeWidth="1.6" strokeLinejoin="round"/></svg>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#1b4332" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 className={styles.successTitle}>Дякуємо! Заявку прийнято</h3>
            <p className={styles.successText}>
              Наш менеджер зв'яжеться з вами найближчим часом. Очікуйте на дзвінок протягом 10 хвилин.
            </p>
            <button type="button" className={styles.closeBtn} onClick={closeModal} data-testid="callback-close-success">Закрити</button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default CallbackModal;
