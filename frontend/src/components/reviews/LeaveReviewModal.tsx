import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import {
  fetchReviewEligibility,
  submitCustomerReview,
  type ReviewEligibility,
} from "../../lib/reviews-api";
import styles from "./LeaveReviewModal.module.css";

export type LeaveReviewModalProps = {
  open: boolean;
  productSlug?: string;
  productName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
};

const MIN_BODY = 10;
const MAX_BODY = 2000;

const StarPicker: React.FC<{
  value: number;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className={styles.starPicker} role="radiogroup" aria-label="Оцінка">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} з 5`}
          className={styles.starBtn}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          data-testid={`leave-review-star-${n}`}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill={n <= display ? "#ACB14F" : "none"} stroke="#ACB14F" strokeWidth="1.6">
            <path d="M12 2.5l2.94 6.57 7.06.75-5.32 4.86 1.55 7.07L12 17.94l-6.23 3.81 1.55-7.07L2 9.82l7.06-.75L12 2.5z" />
          </svg>
        </button>
      ))}
    </div>
  );
};

const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  open,
  productSlug,
  productName,
  onClose,
  onSubmitted,
}) => {
  const { isAuthed } = useAuth();
  const { openAuth } = useAuthModal();

  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setRating(5);
      setBody("");
      setSubmitError(null);
      setSuccessId(null);
    }
  }, [open]);

  // Load eligibility whenever we open + authed.
  useEffect(() => {
    if (!open) return;
    if (!isAuthed) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchReviewEligibility(productSlug)
      .then((e) => {
        if (!cancelled) setEligibility(e);
      })
      .catch(() => {
        if (!cancelled)
          setEligibility({
            eligible: false,
            reason: "no_orders",
            message: "Не вдалося перевірити доступ. Спробуйте ще раз.",
            has_orders: false,
            has_purchased_product: false,
            already_reviewed: false,
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isAuthed, productSlug]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitError(null);
    if (body.trim().length < MIN_BODY) {
      setSubmitError(`Текст відгуку має містити щонайменше ${MIN_BODY} символів.`);
      return;
    }
    setSubmitting(true);
    try {
      const r = await submitCustomerReview({
        rating,
        body: body.trim(),
        product_slug: productSlug,
      });
      setSuccessId(r.id);
      onSubmitted?.();
    } catch (e: any) {
      const detail =
        e?.response?.data?.detail || "Не вдалося надіслати відгук. Спробуйте пізніше.";
      setSubmitError(typeof detail === "string" ? detail : "Помилка надсилання.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Render branches -----
  let content: React.ReactNode = null;
  if (!isAuthed) {
    content = (
      <div className={styles.state} data-testid="leave-review-state-unauth">
        <p className={styles.stateText}>
          Щоб залишити відгук — увійдіть у свій акаунт або зареєструйтесь.
        </p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => {
              onClose();
              openAuth("login");
            }}
            data-testid="leave-review-login-btn"
          >
            Увійти
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => {
              onClose();
              openAuth("register");
            }}
            data-testid="leave-review-register-btn"
          >
            Реєстрація
          </button>
        </div>
      </div>
    );
  } else if (loading) {
    content = (
      <div className={styles.state} data-testid="leave-review-state-loading">
        <p className={styles.stateText}>Перевіряємо доступ…</p>
      </div>
    );
  } else if (successId) {
    content = (
      <div className={styles.state} data-testid="leave-review-state-success">
        <div className={styles.successIcon}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className={styles.successTitle}>Дякуємо за відгук!</h3>
        <p className={styles.stateText}>
          Ваш відгук відправлено на модерацію. Після перевірки адміністратором
          він зʼявиться на сторінці товару.
        </p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            data-testid="leave-review-close-btn"
          >
            Закрити
          </button>
        </div>
      </div>
    );
  } else if (eligibility && !eligibility.eligible) {
    content = (
      <div className={styles.state} data-testid={`leave-review-state-${eligibility.reason || "blocked"}`}>
        <p className={styles.stateText}>{eligibility.message}</p>
        <div className={styles.stateActions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={onClose}
            data-testid="leave-review-close-btn"
          >
            Зрозуміло
          </button>
        </div>
      </div>
    );
  } else {
    const len = body.length;
    content = (
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        data-testid="leave-review-form"
      >
        {productName && (
          <div className={styles.targetProduct} data-testid="leave-review-product">
            Товар: <strong>{productName}</strong>
          </div>
        )}
        <div className={styles.formRow}>
          <label className={styles.label}>Ваша оцінка</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className={styles.formRow}>
          <label className={styles.label} htmlFor="leave-review-body">
            Ваш відгук
          </label>
          <textarea
            id="leave-review-body"
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
            rows={6}
            placeholder="Поділіться досвідом використання — що сподобалось, ефективність, поради…"
            data-testid="leave-review-body"
          />
          <div className={styles.counter}>
            <span className={len < MIN_BODY ? styles.counterWarn : ""}>
              {len}/{MAX_BODY} символів
            </span>
            {len < MIN_BODY && (
              <span className={styles.counterHint}>мінімум {MIN_BODY}</span>
            )}
          </div>
        </div>
        {submitError && (
          <div className={styles.error} data-testid="leave-review-error">
            {submitError}
          </div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onClose}
            disabled={submitting}
            data-testid="leave-review-cancel-btn"
          >
            Скасувати
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={submitting || body.trim().length < MIN_BODY}
            data-testid="leave-review-submit-btn"
          >
            {submitting ? "Надсилаємо…" : "Надіслати відгук"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Залишити відгук"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="leave-review-modal"
    >
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2 className={styles.title}>Залишити відгук</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Закрити"
            data-testid="leave-review-close-x"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={styles.content}>{content}</div>
      </div>
    </div>
  );
};

export default LeaveReviewModal;
