import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { usePolicies } from "../../context/PolicyContext";
import styles from "./CookieBanner.module.css";

/* =====================================================================
   CookieBanner — банер згоди на cookie. Показується один раз
   на пристрій (localStorage flag). Дві дії: «Прийняти», «Детальніше».
   ===================================================================== */

const LS_KEY = "tamis-cookie-consent-v1";

const CookieBanner: React.FC = () => {
  const { openPolicy, loaded } = usePolicies();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LS_KEY);
      if (!stored) {
        // невелика затримка щоб не перекривати hero при першому завантаженні
        const t = setTimeout(() => setShow(true), 900);
        return () => clearTimeout(t);
      }
    } catch { /* noop */ }
  }, [loaded]);

  const accept = () => {
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({
        accepted: true,
        ts: new Date().toISOString(),
      }));
    } catch { /* noop */ }
    setShow(false);
  };

  const showDetails = () => {
    openPolicy("cookie");
  };

  if (!show) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.banner}
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-banner-title"
      data-testid="cookie-banner"
    >
      <div className={styles.inner}>
        <div className={styles.iconWrap} aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path
              d="M21.5 13a4 4 0 0 1-4-4 4 4 0 0 1-4-4 9 9 0 1 0 8 8Z"
              stroke="#1b4332" strokeWidth="1.8" strokeLinejoin="round"
            />
            <circle cx="8.5" cy="12.5" r="1.1" fill="#1b4332" />
            <circle cx="12" cy="16" r="1" fill="#1b4332" />
            <circle cx="15" cy="11" r="0.9" fill="#b3d217" />
          </svg>
        </div>

        <div className={styles.body}>
          <h3 id="cookie-banner-title" className={styles.title}>
            Ми використовуємо cookie
          </h3>
          <p className={styles.text}>
            Сайт TAMIS АГРО використовує cookie для коректної роботи кошика,
            аналітики та персоналізації контенту. Натискаючи «Прийняти»,
            ви погоджуєтесь з нашою{" "}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={showDetails}
              data-testid="cookie-banner-details-inline"
            >
              Cookie Policy
            </button>
            .
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={showDetails}
            data-testid="cookie-banner-details"
          >
            Детальніше
          </button>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={accept}
            data-testid="cookie-banner-accept"
          >
            Прийняти
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CookieBanner;
