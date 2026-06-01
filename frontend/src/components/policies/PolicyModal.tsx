import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { usePolicies } from "../../context/PolicyContext";
import styles from "./PolicyModal.module.css";

/* =====================================================================
   PolicyModal — універсальна модалка для перегляду html-контенту
   будь-якої з 3-х політик. Рендериться через portal.
   ===================================================================== */

const PolicyModal: React.FC = () => {
  const { activeType, closePolicy, policyByType } = usePolicies();

  useEffect(() => {
    if (!activeType) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePolicy();
    };
    window.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [activeType, closePolicy]);

  if (!activeType) return null;
  const policy = policyByType(activeType);
  if (!policy) return null;

  return ReactDOM.createPortal(
    <div
      className={styles.backdrop}
      onClick={closePolicy}
      role="presentation"
      data-testid="policy-modal-backdrop"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        data-testid="policy-modal"
      >
        <header className={styles.header}>
          <h2 id="policy-modal-title" className={styles.title}>
            {policy.title}
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={closePolicy}
            aria-label="Закрити"
            data-testid="policy-modal-close"
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
        </header>

        <div
          className={styles.content}
          data-testid="policy-modal-content"
          dangerouslySetInnerHTML={{ __html: policy.html_content || "" }}
        />

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.acceptBtn}
            onClick={closePolicy}
            data-testid="policy-modal-ok"
          >
            Зрозуміло
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default PolicyModal;
