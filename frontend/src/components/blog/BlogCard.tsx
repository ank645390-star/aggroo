import React from "react";
import { Link } from "react-router-dom";
import styles from "./BlogCard.module.css";

/* =====================================================================
   BlogCard — верстка відтворена з дизайну card-blog1 (Figma).
   Підтримує два варіанти ширини:
     - "regular" (544px) — картка для сітки 3×3
     - "wide" (828px) — фічерна картка в верхньому ряду
   showFire — чи показувати іконку вогню поруч з категорією (hot/trending).
   ===================================================================== */

export type BlogCardData = {
  id: string;
  slug: string;
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  hot?: boolean;
  readingMinutes?: number;
};

export type BlogCardProps = {
  post: BlogCardData;
  variant?: "regular" | "wide";
  className?: string;
};

const BlogCard: React.FC<BlogCardProps> = ({
  post,
  variant = "regular",
  className = "",
}) => {
  const classes = [
    styles.card,
    variant === "wide" ? styles.cardWide : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={classes}
      data-testid={`blog-card-${post.slug}`}
    >
      <Link
        to={`/blog/${post.slug}`}
        className={styles.imageLink}
        aria-label={post.title}
      >
        <img
          loading="lazy"
          decoding="async"
          className={styles.image}
          src={post.image}
          alt={post.title}
          width={828}
          height={456}
        />
      </Link>

      <div className={styles.tag}>
        {post.hot && (
          <img
            loading="lazy"
            decoding="async"
            className={styles.fireIcon}
            src="/tag-fire.png"
            alt=""
            width={16}
            height={16}
          />
        )}
        <span className={styles.tagLabel}>{post.category}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.textBlock}>
          <div className={styles.metaRow}>
            <span className={styles.date}>{post.date}</span>
            {typeof post.readingMinutes === "number" && post.readingMinutes > 0 && (
              <>
                <span className={styles.metaDot} aria-hidden="true">•</span>
                <span className={styles.readingTime} title="Час на прочитання">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {post.readingMinutes} хв
                </span>
              </>
            )}
          </div>
          <h3 className={styles.title}>{post.title}</h3>
          <p className={styles.excerpt}>{post.excerpt}</p>
        </div>

        <Link
          to={`/blog/${post.slug}`}
          className={styles.cta}
          data-testid={`blog-card-cta-${post.slug}`}
        >
          <span className={styles.ctaLabel}>Читати більше</span>
          <span className={styles.ctaIcon} aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="#1b4332"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </Link>
      </div>
    </article>
  );
};

export default BlogCard;
