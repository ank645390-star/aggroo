import React from "react";
import styles from "./card-review1.module.css";

export type CardReview1Type = {
  className?: string;
  /** Top category/tag (e.g. "Біоінсектициди") */
  category?: string;
  /** Main review body */
  body?: string;
  /** Author name + role merged (used as bottom line) */
  author?: string;
  /** Optional separate author name (preferred over `author` if both given) */
  authorName?: string;
  /** Optional avatar URL (rendered as a small photo before the author name) */
  photo?: string;
  /** 1..5 — renders ★ icons in lime */
  rating?: number;
  /** Free-form date string (e.g. "Травень 2024") */
  date?: string;
};

const Star: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill={filled ? "#ACB14F" : "none"}
    stroke="#ACB14F"
    strokeWidth="1.6"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <path d="M12 2.5l2.94 6.57 7.06.75-5.32 4.86 1.55 7.07L12 17.94l-6.23 3.81 1.55-7.07L2 9.82l7.06-.75L12 2.5z" />
  </svg>
);

const CardReview1: React.FC<CardReview1Type> = ({
  className = "",
  category,
  body,
  author,
  authorName,
  photo,
  rating,
  date,
}) => {
  const headline = category;
  const displayName = authorName || "";
  const bottomLine = author || "";

  return (
    <section className={[styles.cardReview, className].join(" ")}>
      <div className={styles.reviewContent}>
        {/* Top tag pill (category) — green/lime badge */}
        {headline ? (
          <span className={styles.tag} data-testid="review-tag">{headline}</span>
        ) : null}

        {body ? <p className={styles.div}>{body}</p> : null}

        {/* Optional rating + date row */}
        {(rating || date) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
            aria-label={rating ? `Рейтинг ${rating} з 5` : undefined}
          >
            {rating ? (
              <span
                style={{
                  display: "inline-flex",
                  gap: "3px",
                  alignItems: "center",
                }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} filled={i < rating} />
                ))}
              </span>
            ) : null}
            {date ? (
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b6b66",
                  fontWeight: 500,
                }}
              >
                {date}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Author block — photo + name/role */}
      <div
        style={{
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={displayName || bottomLine}
            width={48}
            height={48}
            loading="lazy"
            decoding="async"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(27,67,50,0.12)",
              flexShrink: 0,
            }}
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            flex: 1,
            minWidth: 0,
          }}
        >
          {displayName ? (
            <span
              className={styles.author}
              style={{
                fontWeight: 700,
                color: "#1b4332",
                fontSize: "16px",
                lineHeight: 1.25,
              }}
            >
              {displayName}
            </span>
          ) : null}
          {bottomLine && bottomLine !== displayName ? (
            <span
              className={styles.author}
              style={{
                fontWeight: 500,
                fontSize: "14px",
                color: "#6b6b66",
                lineHeight: 1.3,
              }}
            >
              {bottomLine}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CardReview1;
