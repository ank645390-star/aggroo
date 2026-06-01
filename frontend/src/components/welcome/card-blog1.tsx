import React from "react";
import { Link } from "react-router-dom";
import styles from "./card-blog1.module.css";

export type CardBlog1Type = {
  className?: string;
  image: string;
  title: string;
  description: string;
  /** Slug — required for navigation; if absent, card becomes non-clickable (legacy). */
  slug?: string;
  /** Optional category badge shown on top-left of the image (style matches /blog cards). */
  category?: string;
  /** Optional reading time (minutes) shown after the title. */
  readingMinutes?: number;
  /** Optional publication date — shown above title (long format if provided). */
  date?: string;
  /** Backwards-compat — kept so legacy callers won't break */
  imageContainer?: string;
  showRole?: boolean;
  showDate?: boolean;
  showButton?: boolean;
  showTag?: boolean;
  device?: any;
  device1?: any;
  prop?: string;
  showLabel?: boolean;
  primaryButtonJustifyContent?: any;
  iconContainerBackgroundColor?: any;
  size?: any;
  showFire?: boolean;
};

const CardBlog1: React.FC<CardBlog1Type> = ({
  className = "",
  image,
  title,
  description,
  slug,
  category,
  readingMinutes,
  date,
}) => {
  const inner = (
    <article
      className={[styles.cardBlog, className].join(" ")}
      data-testid={slug ? `welcome-blog-card-${slug}` : "blog-card"}
    >
      <div className={styles.imageWrap}>
        <img
          decoding="async"
          className={styles.imageContainer}
          loading="lazy"
          width={544}
          height={459}
          alt={title}
          src={image}
        />
        {category && <span className={styles.categoryBadge}>{category}</span>}
      </div>
      <div className={styles.content}>
        <div className={styles.textBlock}>
          {(date || typeof readingMinutes === "number") && (
            <div className={styles.metaRow}>
              {date && <span className={styles.date}>{date}</span>}
              {date && typeof readingMinutes === "number" && readingMinutes > 0 && (
                <span className={styles.metaDot} aria-hidden="true">•</span>
              )}
              {typeof readingMinutes === "number" && readingMinutes > 0 && (
                <span className={styles.readingTime}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M12 7v5l3 2"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {readingMinutes} хв
                </span>
              )}
            </div>
          )}
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
        </div>
        <span className={styles.readMore} aria-label="Читати більше">
          <span className={styles.readMoreLabel}>Читати більше</span>
          <img
            loading="lazy"
            decoding="async"
            className={styles.iconArrow}
            src="/icon-container-arrow.png"
            alt=""
            width={48}
            height={48}
            draggable={false}
          />
        </span>
      </div>
    </article>
  );

  if (slug) {
    return (
      <Link
        to={`/blog/${slug}`}
        className={styles.cardLink}
        aria-label={title}
      >
        {inner}
      </Link>
    );
  }
  return inner;
};

export default CardBlog1;
