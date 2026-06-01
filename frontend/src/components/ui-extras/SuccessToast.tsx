import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import styles from "./success-toast.module.css";

/**
 * Тост успіху, що з'являється праворуч-зверху та зникає через 2.5 c.
 * Викликається з батьківського компонента через state (open + message).
 *
 * Рендериться у document.body через createPortal, щоб правильно
 * позиціонуватися відносно viewport (а не масштабованої сторінки).
 */
type Props = {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number; // ms
};

const SuccessToast: React.FC<Props> = ({ open, message, onClose, duration = 2500 }) => {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  const body = (
    <div className={styles.wrap} role="status" aria-live="polite" data-testid="success-toast">
      <div className={styles.toast}>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" fill="#1b4332" />
            <path
              d="M5.5 10.5L9 14L14.5 7"
              stroke="#ffffff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className={styles.text}>{message}</span>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Закрити"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2L12 12M12 2L2 12" stroke="#93928c" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? ReactDOM.createPortal(body, document.body)
    : body;
};

export default SuccessToast;
