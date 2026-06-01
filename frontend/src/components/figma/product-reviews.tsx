import React, { useEffect, useMemo, useState } from "react";
import { listReviewsPublic, type ReviewItem } from "../../lib/reviews-api";
import styles from "./product-reviews.module.css";

export type ProductReviewsProps = {
  productSlug?: string;
  /** Заголовок секції; за замовчуванням — "Відгуки про товар". */
  title?: string;
};

const CARD_WIDTH = 420; // px (compact card for the product page)
const CARD_GAP = 20;
const SLIDE_PX = CARD_WIDTH + CARD_GAP;
const VISIBLE_CARDS = 3;

const Star: React.FC<{ filled: boolean; size?: number }> = ({ filled, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "#ACB14F" : "none"}
    stroke="#ACB14F"
    strokeWidth="1.6"
    aria-hidden="true"
  >
    <path d="M12 2.5l2.94 6.57 7.06.75-5.32 4.86 1.55 7.07L12 17.94l-6.23 3.81 1.55-7.07L2 9.82l7.06-.75L12 2.5z" />
  </svg>
);

/**
 * Список відгуків саме до поточного товару.
 * Дані з GET /api/reviews?product_slug=...&published=true.
 * Якщо нічого немає — секція не рендериться.
 */
const ProductReviews: React.FC<ProductReviewsProps> = ({
  productSlug,
  title = "Відгуки про товар",
}) => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!productSlug) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    listReviewsPublic({ product_slug: productSlug, limit: 24 })
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productSlug]);

  const pages = useMemo(
    () => Math.max(1, items.length - VISIBLE_CARDS + 1),
    [items.length]
  );
  useEffect(() => {
    if (step > pages - 1) setStep(Math.max(0, pages - 1));
  }, [pages, step]);

  const avgRating = useMemo(() => {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  // Hide entirely if there are no reviews for this product
  if (loaded && items.length === 0) return null;

  const canPrev = step > 0;
  const canNext = step < pages - 1;

  return (
    <section className={styles.section} data-testid="product-reviews">
      <div className={styles.inner}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{title}</h2>
            {items.length > 0 && (
              <div className={styles.headerStats}>
                <span className={styles.starsRow}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} filled={i < Math.round(avgRating)} />
                  ))}
                </span>
                <span className={styles.statsAvg}>{avgRating.toFixed(1)}</span>
                <span className={styles.statsCount}>
                  {items.length}{" "}
                  {items.length === 1
                    ? "відгук"
                    : items.length < 5
                    ? "відгуки"
                    : "відгуків"}
                </span>
              </div>
            )}
          </div>
          {pages > 1 && (
            <div className={styles.arrows}>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => canPrev && setStep((s) => s - 1)}
                disabled={!canPrev}
                aria-label="Попередній"
                data-testid="product-reviews-prev"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => canNext && setStep((s) => s + 1)}
                disabled={!canNext}
                aria-label="Наступний"
                data-testid="product-reviews-next"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </header>

        <div className={styles.viewport}>
          <div
            className={styles.track}
            style={{ transform: `translate3d(${-step * SLIDE_PX}px, 0, 0)` }}
            data-testid="product-reviews-track"
          >
            {items.map((r) => (
              <article key={r.id} className={styles.card}>
                <div className={styles.cardTop}>
                  {r.category && (
                    <span className={styles.tag}>{r.category}</span>
                  )}
                  <span className={styles.cardRating}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} filled={i < r.rating} size={14} />
                    ))}
                  </span>
                </div>
                <p className={styles.cardBody}>{r.body}</p>
                <div className={styles.cardAuthor}>
                  {r.author_photo ? (
                    <img
                      src={r.author_photo}
                      alt={r.author_name}
                      width={44}
                      height={44}
                      loading="lazy"
                      className={styles.authorPhoto}
                    />
                  ) : (
                    <div className={styles.authorPhotoPlaceholder}>
                      {(r.author_name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.authorMeta}>
                    {r.author_name && (
                      <span className={styles.authorName}>{r.author_name}</span>
                    )}
                    {r.author_role && (
                      <span className={styles.authorRole}>{r.author_role}</span>
                    )}
                  </div>
                  {r.display_date && (
                    <span className={styles.authorDate}>{r.display_date}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        {pages > 1 && (
          <div className={styles.dots}>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Сторінка ${i + 1}`}
                className={`${styles.dot} ${i === step ? styles.dotActive : ""}`}
                data-testid={`product-reviews-dot-${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductReviews;
