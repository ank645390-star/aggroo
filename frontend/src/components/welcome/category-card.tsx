import React from "react";
import { Link } from "react-router-dom";
import styles from "./category-card.module.css";

export type CategoryCardProps = {
  /** Картинка-иконка (PNG/SVG из /public). Помещается внутри зелёного круга. */
  iconSrc: string;
  /** Точный размер иконки внутри круга — фикс согласно дизайну. */
  iconWidth: number;
  iconHeight: number;
  /** Заголовок категории */
  title: string;
  /** Краткое описание */
  description: string;
  /** Текст ссылки в подвале карточки */
  ctaLabel?: string;
  /**
   * Slug категорії (відповідає `product_categories.slug`).
   * Якщо переданий — клік по картці веде на `/catalog?category=<slug>`.
   * Якщо порожній — веде просто на `/catalog`.
   */
  slug?: string;
  /** Manual override для href (для нестандартних випадків). */
  href?: string;
  className?: string;
};

/**
 * Карточка категории биопрепаратов.
 * Структура: круг с иконкой → заголовок → описание → CTA «Детальніше →».
 * Уся картка є інтерактивним лінком (анімований ховер + перехід у каталог
 * з активним фільтром по слугу).
 */
const CategoryCard: React.FC<CategoryCardProps> = ({
  iconSrc,
  iconWidth,
  iconHeight,
  title,
  description,
  ctaLabel = "Детальніше",
  slug,
  href,
  className = "",
}) => {
  const target =
    href ?? (slug ? `/catalog?category=${encodeURIComponent(slug)}` : "/catalog");

  return (
    <Link
      to={target}
      className={[styles.card, className].join(" ")}
      data-testid="category-card"
      data-slug={slug || ""}
      aria-label={`${title} — перейти до каталогу`}
    >
      {/* Decorative ribbon visible on hover */}
      <span className={styles.hoverRibbon} aria-hidden="true" />

      <div className={styles.iconCircle} aria-hidden="true">
        {/* Subtle pulse ring behind the icon — appears on hover */}
        <span className={styles.iconPulse} />
        <img
          decoding="async"
          className={styles.iconImg}
          src={iconSrc}
          alt=""
          width={iconWidth}
          height={iconHeight}
          loading="lazy"
          style={{ width: `${iconWidth}px`, height: `${iconHeight}px` }}
        />
      </div>

      <h3 className={styles.title}>{title}</h3>
      <p className={styles.description}>{description}</p>

      <span className={styles.cta} data-testid="category-card-cta">
        <span className={styles.ctaText}>{ctaLabel}</span>
        <span className={styles.ctaArrow} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </Link>
  );
};

export default CategoryCard;
