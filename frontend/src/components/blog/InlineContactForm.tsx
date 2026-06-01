import React, { useMemo, useState } from "react";
import { authedApi } from "../../lib/auth-api";
import styles from "./InlineContactForm.module.css";

/* =====================================================================
   InlineContactForm — компактна форма зворотного зв'язку, яка ставиться
   внизу сторінки конкретної статті блогу. Відправляє повідомлення на
   /api/contact-messages, точно як модалка "Написати на пошту", але
   inline-варіант — без оверлею, у стилі сайту.
   ===================================================================== */

export type InlineContactFormProps = {
  defaultSubject?: string;
  className?: string;
};

const InlineContactForm: React.FC<InlineContactFormProps> = ({
  defaultSubject = "",
  className = "",
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      !sending &&
      name.trim().length > 1 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      message.trim().length > 4 &&
      consent,
    [name, email, message, consent, sending]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setErr(null);
    try {
      await authedApi.post("/contact-messages", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        subject: subject.trim(),
        message: message.trim(),
        consent: true,
      });
      setSentOk(true);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (e: any) {
      setErr(
        e?.response?.data?.detail ||
          "Не вдалося відправити повідомлення. Спробуйте трохи пізніше або зателефонуйте нам."
      );
    } finally {
      setSending(false);
    }
  };

  if (sentOk) {
    return (
      <section
        className={[styles.shell, styles.successShell, className].filter(Boolean).join(" ")}
        data-testid="post-inline-contact-success"
      >
        <div className={styles.successInner}>
          <span className={styles.successIcon} aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#b3d217" />
              <path
                d="m7 12 3.5 3.5L17 9"
                stroke="#1b4332"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h3 className={styles.successTitle}>Дякуємо! Повідомлення відправлено</h3>
          <p className={styles.successText}>
            Наш агроном відповість вам протягом одного робочого дня. Якщо питання термінове —
            зателефонуйте нам.
          </p>
          <button
            type="button"
            className={styles.successBtn}
            onClick={() => setSentOk(false)}
          >
            Надіслати ще одне повідомлення
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[styles.shell, className].filter(Boolean).join(" ")}
      data-testid="post-inline-contact"
    >
      <div className={styles.intro}>
        <h2 className={styles.title}>Залишилися питання?</h2>
        <p className={styles.subtitle}>
          Напишіть нам — і досвідчений агроном відповість вам протягом одного робочого дня.
          Конфіденційність гарантована.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>
              Ваше імʼя <span className={styles.req}>*</span>
            </span>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Іван Шевченко"
              autoComplete="name"
              required
              data-testid="post-contact-name"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>
              Email <span className={styles.req}>*</span>
            </span>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agronom@gospodarstvo.ua"
              autoComplete="email"
              required
              data-testid="post-contact-email"
            />
          </label>
        </div>

        <div className={styles.row2}>
          <label className={styles.field}>
            <span className={styles.label}>Телефон</span>
            <input
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380 50 123 45 67"
              autoComplete="tel"
              data-testid="post-contact-phone"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Тема</span>
            <input
              type="text"
              className={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Що цікавить?"
              data-testid="post-contact-subject"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>
            Питання чи коментар <span className={styles.req}>*</span>
          </span>
          <textarea
            className={styles.textarea}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Опишіть культуру, площу, проблему — і ми порадимо найкращу схему."
            required
            data-testid="post-contact-message"
          />
        </label>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            data-testid="post-contact-consent"
          />
          <span>
            Я погоджуюся з обробкою персональних даних згідно з{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              Політикою конфіденційності
            </a>
            .
          </span>
        </label>

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.submit}
            disabled={!canSubmit}
            data-testid="post-contact-submit"
          >
            {sending ? "Надсилаємо…" : "Надіслати повідомлення"}
          </button>
          <span className={styles.hint}>
            Або зателефонуйте: <a href="tel:+380509375657">+380 (50) 937-56-57</a>
          </span>
        </div>
      </form>
    </section>
  );
};

export default InlineContactForm;
