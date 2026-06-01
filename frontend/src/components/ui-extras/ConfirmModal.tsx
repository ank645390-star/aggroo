import React from "react";
import ReactDOM from "react-dom";
import styles from "./confirm-modal.module.css";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

const ConfirmModal: React.FC<Props> = ({
  open,
  title,
  message,
  confirmLabel = "Підтвердити",
  cancelLabel = "Скасувати",
  variant = "default",
  onConfirm,
  onClose,
}) => {
  if (!open) return null;
  const body = (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        data-testid="confirm-modal"
      >
        <h2 className={styles.title}>{title}</h2>
        {message ? <p className={styles.message}>{message}</p> : null}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            data-testid="confirm-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === "danger" ? styles.dangerBtn : styles.confirmBtn}
            onClick={onConfirm}
            data-testid="confirm-ok"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
  // Render in document.body so the modal escapes the page's transform: scale wrapper
  // and is centered relative to the viewport. The modal itself scales via CSS var.
  return typeof document !== "undefined"
    ? ReactDOM.createPortal(body, document.body)
    : body;
};

export default ConfirmModal;
