import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useEmailModal } from "../../context/EmailModalContext";
import { useContactInfo } from "../../context/ContactInfoContext";
import { usePolicies } from "../../context/PolicyContext";
import { submitContactMessage } from "../../lib/email-api";
import styles from "./EmailModal.module.css";

/* =====================================================================
   EmailModal — «Написати нам на пошту».
   Викликається з футеру та зі сторінки Контакти при кліку на email.
   Поля: ім'я, email, телефон (опц.), тема (опц.), повідомлення,
   згода на обробку ПД. Надсилає POST /api/contact-messages.
   Рендериться через portal — виходить за межі transform:scale.
   Дизайн у тому ж візуальному стилі, як CallbackModal.
   ===================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailModal: React.FC = () => {
  const { open, defaultSubject, closeEmailModal } = useEmailModal();
  const { openPolicy, policyByType } = usePolicies();
  const { info } = useContactInfo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPhone("");
      setSubject(defaultSubject);
      setMessage("");
      setConsent(false);
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open, defaultSubject]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeEmailModal();
    };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, closeEmailModal]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Вкажіть ваше ім'я");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Некоректний email");
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setError("Напишіть ваше повідомлення (мін. 5 символів)");
      return;
    }
    if (!consent) {
      setError("Потрібна згода на обробку перс. даних");
      return;
    }
    setSubmitting(true);
    try {
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
        phone: phone.trim() || undefined,
        consent: true,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Не вдалося надіслати. Спробуйте ще раз."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div
      className={styles.backdrop}
      onClick={closeEmailModal}
      role="presentation"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="email-modal"
      >
        <button
          type="button"
          className={styles.close}
          onClick={closeEmailModal}
          aria-label="Закрити"
          data-testid="email-modal-close"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5L15 15M15 5L5 15"
              stroke="#2C2C27"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {!success ? (
          <>
            <div className={styles.header}>
              <div className={styles.iconWrap}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                    stroke="#1b4332"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m4 8 7.4 5.3a1 1 0 0 0 1.2 0L20 8"
                    stroke="#1b4332"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <h2 className={styles.title}>Написати нам на пошту</h2>
                <p className={styles.subtitle}>
                  Наш менеджер відповість на {info.email || "нашу пошту"} протягом робочого дня
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Ім'я<span className={styles.req}> *</span>
                  </span>
                  <input
                    className={styles.input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Іван"
                    data-testid="email-modal-name"
                    autoFocus
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Email<span className={styles.req}> *</span>
                  </span>
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    data-testid="email-modal-email"
                  />
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Телефон{" "}
                    <span style={{ color: "#93928c", fontWeight: 400 }}>
                      (опціонально)
                    </span>
                  </span>
                  <input
                    className={styles.input}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+380 (XX) XXX XX XX"
                    data-testid="email-modal-phone"
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Тема{" "}
                    <span style={{ color: "#93928c", fontWeight: 400 }}>
                      (опціонально)
                    </span>
                  </span>
                  <input
                    className={styles.input}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Про що бажаєте дізнатись?"
                    data-testid="email-modal-subject"
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Повідомлення<span className={styles.req}> *</span>
                </span>
                <textarea
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Опишіть ваше питання або запит — ми зв'яжемося з вами"
                  data-testid="email-modal-message"
                  rows={5}
                />
              </label>

              <label className={styles.consent}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  data-testid="email-modal-consent"
                />
                <span>
                  Я даю згоду на обробку моїх персональних даних відповідно до{" "}
                  <button
                    type="button"
                    className={styles.consentLink}
                    onClick={(e) => { e.preventDefault(); openPolicy("privacy"); }}
                    data-testid="email-modal-consent-privacy-link"
                  >
                    {policyByType("privacy")?.button_label || "Privacy Policy"}
                  </button>
                  {" "}та{" "}
                  <button
                    type="button"
                    className={styles.consentLink}
                    onClick={(e) => { e.preventDefault(); openPolicy("terms"); }}
                    data-testid="email-modal-consent-terms-link"
                  >
                    {policyByType("terms")?.button_label || "Terms of Use"}
                  </button>
                </span>
              </label>

              {error && (
                <div className={styles.error} data-testid="email-modal-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
                data-testid="email-modal-submit"
              >
                {submitting ? (
                  "Надсилаємо…"
                ) : (
                  <>
                    Надіслати повідомлення
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z"
                        stroke="#f9f7f2"
                        strokeWidth="1.6"
                      />
                      <path
                        d="m4 8 7.4 5.3a1 1 0 0 0 1.2 0L20 8"
                        stroke="#f9f7f2"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12l5 5L20 7"
                  stroke="#1b4332"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className={styles.successTitle}>Дякуємо! Повідомлення надіслано</h3>
            <p className={styles.successText}>
              Наш менеджер зв'яжеться з вами найближчим часом на вказану вами пошту.
            </p>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeEmailModal}
              data-testid="email-modal-close-success"
            >
              Закрити
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default EmailModal;
