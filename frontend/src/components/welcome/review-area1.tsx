import React, { useEffect, useMemo, useRef, useState } from "react";
import CardReview1 from "./card-review1";
import {
  listReviewsPublic,
  type ReviewItem,
} from "../../lib/reviews-api";
import { useSwipeable } from "../../lib/use-swipeable";
import styles from "./review-area1.module.css";

/* =====================================================================
   Review area on the welcome page — «Фермери обирають нас».

   Coverflow-style presentation:
   - one ACTIVE review is fully visible and forward
   - the next/prev review sits slightly behind, scaled down, blurred and
     desaturated (subtle "frosted glass" feel) — still readable, but
     visually deprioritised
   - any other reviews are hidden (opacity 0, pointer-events: none)
   - dots + arrows allow stepping through the list
   ===================================================================== */

export type ReviewArea1Type = {
  className?: string;
};

const CARD_WIDTH = 541; // px (matches existing design)

const ReviewArea1: React.FC<ReviewArea1Type> = ({ className = "" }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listReviewsPublic({ highlighted: true, limit: 24 })
      .then((data) => {
        if (cancelled) return;
        setReviews(data);
      })
      .catch(() => {
        // fail silently — section will simply hide itself below
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = reviews.length;
  // Guard active in case data length changes
  useEffect(() => {
    if (active > total - 1) setActive(Math.max(0, total - 1));
  }, [total, active]);

  const canPrev = active > 0;
  const canNext = active < total - 1;
  const handlePrev = () => { if (canPrev) setActive((a) => a - 1); };
  const handleNext = () => { if (canNext) setActive((a) => a + 1); };

  // Swipe / drag support — пальцем, мишею і горизонтальним
  // двопальцевим жестом тачпада. На mobile native horizontal scroll
  // обробляє свайп напряму, тож хук відключений (disabled).
  const stageSwipeRef = useSwipeable<HTMLDivElement>({
    onNext: handleNext,
    onPrev: handlePrev,
    threshold: 50,
    enabled: () => !isMobile && total > 1,
  });

  /* Mobile: sync `active` dot index with the user's horizontal scroll
     position in the stage. */
  useEffect(() => {
    if (!isMobile) return;
    const el = stageRef.current;
    if (!el) return;
    let raf = 0;
    const compute = () => {
      raf = 0;
      const card = el.querySelector<HTMLElement>("[class*='slot']");
      if (!card) return;
      const cardW = card.getBoundingClientRect().width || 1;
      const gap = 16;
      const idx = Math.round(el.scrollLeft / (cardW + gap));
      const clamped = Math.max(0, Math.min(total - 1, idx));
      setActive((prev) => (prev === clamped ? prev : clamped));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(compute);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    compute();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isMobile, total]);

  /* Mobile dot click → scroll the stage to the target card. */
  const handleDotClick = (i: number) => {
    if (isMobile) {
      const el = stageRef.current;
      if (!el) return;
      const cards = el.querySelectorAll<HTMLElement>("[class*='slot']");
      const card = cards[i];
      if (card) {
        const cardW = card.getBoundingClientRect().width || 1;
        const gap = 16;
        el.scrollTo({ left: i * (cardW + gap), behavior: "smooth" });
      }
      setActive(i);
    } else {
      setActive(i);
    }
  };

  // Pre-compute the visual role of each card (active / prev / next / hidden)
  const roleOf = (i: number): "active" | "prev" | "next" | "hidden" => {
    const d = i - active;
    if (d === 0) return "active";
    if (d === -1) return "prev";
    if (d === 1) return "next";
    return "hidden";
  };

  // Hide entirely if API returned nothing (admin removed all highlighted reviews)
  if (loaded && reviews.length === 0) {
    return null;
  }

  return (
    <section
      className={[styles.reviewArea, className].join(" ")}
      data-testid="reviews-section"
    >
      <div className={styles.reviewSection}>
        {/* Title */}
        <div className={styles.headlineButton}>
          <div className={styles.div}>
            <span className={styles.span}>
              <span className={styles.span2}>Фермери</span>
              <span className={styles.span3}>{` `}</span>
            </span>
            <span className={styles.span4}>обирають нас</span>
          </div>
        </div>

        {/* Image + coverflow stage */}
        <div className={styles.reviewGroup}>
          <div className={styles.imageRow}>
            <img
              loading="lazy"
              decoding="async"
              className={styles.imageIcon}
              width={504}
              height={404}
              alt=""
              src="/image4@2x.webp"
            />
            <div
              className={styles.stage}
              data-testid="reviews-stage"
              ref={(el) => {
                stageRef.current = el;
                if (typeof stageSwipeRef === "function") {
                  (stageSwipeRef as unknown as (n: HTMLDivElement | null) => void)(el);
                } else if (stageSwipeRef && "current" in (stageSwipeRef as any)) {
                  (stageSwipeRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                }
              }}
              style={{ touchAction: isMobile ? "pan-x pan-y" : "pan-y", userSelect: "none" }}
            >
              {reviews.map((review, i) => {
                const role = roleOf(i);
                return (
                  <div
                    key={review.id}
                    className={[styles.slot, styles[role]].join(" ")}
                    aria-hidden={role !== "active"}
                    style={{ width: CARD_WIDTH }}
                    onClick={() => {
                      if (role === "prev") handlePrev();
                      else if (role === "next") handleNext();
                    }}
                  >
                    <CardReview1
                      category={review.category}
                      body={review.body}
                      author={review.author_role || review.author_name}
                      authorName={review.author_name}
                      photo={review.author_photo}
                      rating={review.rating}
                      date={review.display_date}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls: dots centered, arrows right */}
          {total > 1 && (
            <div className={styles.controlsRow}>
              <div className={styles.dotsCell}>
                <SliderDots
                  active={active}
                  total={total}
                  onSelect={handleDotClick}
                />
              </div>
              <div className={styles.arrowsCell}>
                <div className={styles.arrowsBar}>
                  <button
                    className={styles.arrowBtn}
                    onClick={handlePrev}
                    disabled={!canPrev}
                    aria-label="Previous review"
                    type="button"
                    data-testid="reviews-prev"
                  >
                    {canPrev ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        className={`${styles.arrowImg} ${styles.arrowImgFlip}`}
                        src="/arrow-right-active.png"
                        alt=""
                        width={36}
                        height={36}
                        draggable={false}
                      />
                    ) : (
                      <img
                        loading="lazy"
                        decoding="async"
                        className={styles.arrowImg}
                        src="/arrow-left-disabled.png"
                        alt=""
                        width={36}
                        height={36}
                        draggable={false}
                      />
                    )}
                  </button>
                  <button
                    className={styles.arrowBtn}
                    onClick={handleNext}
                    disabled={!canNext}
                    aria-label="Next review"
                    type="button"
                    data-testid="reviews-next"
                  >
                    {canNext ? (
                      <img
                        loading="lazy"
                        decoding="async"
                        className={styles.arrowImg}
                        src="/arrow-right-active.png"
                        alt=""
                        width={36}
                        height={36}
                        draggable={false}
                      />
                    ) : (
                      <img
                        loading="lazy"
                        decoding="async"
                        className={`${styles.arrowImg} ${styles.arrowImgFlip}`}
                        src="/arrow-left-disabled.png"
                        alt=""
                        width={36}
                        height={36}
                        draggable={false}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/* Dots: 96×36 wrapper, justify-content: space-between */
const SliderDots: React.FC<{
  active: number;
  total: number;
  onSelect?: (i: number) => void;
}> = ({ active, total, onSelect }) => {
  const dots = Array.from({ length: total }, (_, i) => i);
  /* Cap rendered dot count visually at 8 to avoid overflow with many reviews;
     active dot still slides through the logical range. */
  const visible = Math.min(8, total);
  const safeActive = total > visible ? Math.min(visible - 1, Math.floor((active / Math.max(1, total - 1)) * (visible - 1))) : active;
  return (
    <div
      style={{
        minWidth: "96px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        gap: total <= 4 ? undefined : 8,
        justifyContent: "space-between",
      }}
    >
      {dots.slice(0, visible).map((i) => {
        const isActive = total > visible ? i === safeActive : i === active;
        const realIndex = total > visible ? Math.round((i / (visible - 1)) * (total - 1)) : i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect?.(realIndex)}
            aria-label={`Page ${realIndex + 1}`}
            data-testid={`reviews-dot-${i}`}
            style={{
              cursor: "pointer",
              background: "transparent",
              border: 0,
              padding: 0,
              height: "36px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                display: "block",
                height: "12px",
                width: isActive ? "24px" : "12px",
                borderRadius: "50px",
                backgroundColor: isActive ? "#1b4332" : "transparent",
                border: isActive ? "none" : "1px solid #1b4332",
                transition:
                  "width 240ms ease, background-color 240ms ease, border-color 240ms ease",
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

export default ReviewArea1;
