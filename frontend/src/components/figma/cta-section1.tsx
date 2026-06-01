import React from "react";
import Call1 from "./call1";
import styles from "./cta-section1.module.css";
import { useCallbackModal } from "../../context/CallbackContext";
import { useContactInfo } from "../../context/ContactInfoContext";

export type CtaSection1Type = {
  className?: string;
  /** Override headline — used on /cultures ("Не знайшли вашу культуру?") */
  title?: string;
  /** Override subtitle. Supports React node so callers can pass <b> markup. */
  subtitle?: React.ReactNode;
};

/** Small inline 40×40 clock icon — identical look to /contacts page badge. */
const IconClockWhite: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.33 20C3.33 10.795 10.795 3.33 20 3.33C29.205 3.33 36.67 10.795 36.67 20C36.67 29.205 29.205 36.67 20 36.67C10.795 36.67 3.33 29.205 3.33 20Z"
      stroke="#F9F7F2"
      strokeWidth="1.67"
      strokeLinecap="square"
    />
    <path d="M20 10.83V20L25 25" stroke="#F9F7F2" strokeWidth="1.67" strokeLinecap="square" />
  </svg>
);

/**
 * Section "НЕ ЗНАЙШЛИ ВАШ ПРЕПАРАТ?" — reused on /catalog, /cultures,
 * /about and /product (single product). Optional `title`/`subtitle`
 * props let callers override the copy (e.g. on /cultures we say
 * "НЕ ЗНАЙШЛИ ВАШУ КУЛЬТУРУ?"). Includes a 24-год badge bottom-left
 * with the same dark-green frosted-glass styling as the /contacts page.
 *
 * Кнопка «Отримати консультацію» відкриває ту ж саму callback-модалку,
 * що й «Замовити дзвінок» у хедері / footer / каталозі. Номер телефону
 * та значення для click-to-call беруться з ContactInfoContext, тому що
 * адміністратор має змогу змінювати їх в /admin/contact-info.
 */
const CtaSection1: React.FC<CtaSection1Type> = ({
  className = "",
  title = "Не знайшли ваш препарат?",
  subtitle = "Ми безкоштовно підберемо схему захисту під вашу культуру.",
}) => {
  const { openModal: openCallback } = useCallbackModal();
  const { info } = useContactInfo();

  return (
    <section
      className={[styles.ctaSection, className].join(" ")}
      data-testid="product-cta-section"
    >
      <img
        loading="lazy"
        decoding="async"
        className={styles.bg}
        alt=""
        src="/anna-50943-A-modern-agronomist-standing-in-a-lush-green-agricul-cf388352-4200-433f-9f6c-95455d39b194-1@2x.webp"
      />
      {/* subtle scrim so the cream type contrasts on the photo */}
      <div className={styles.scrim} aria-hidden="true" />

      <div className={styles.mainContent}>
        <div className={styles.headline}>
          <h2 className={styles.title} data-testid="product-cta-title">
            {title}
          </h2>
          <h3 className={styles.subtitle} data-testid="product-cta-subtitle">
            {subtitle}
          </h3>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            className={styles.ctaButton}
            data-testid="product-cta-button"
            onClick={openCallback}
          >
            <span className={styles.ctaLabel}>Отримати консультацію</span>
            <span className={styles.ctaIcon} aria-hidden="true">
              <Call1 size={24} />
            </span>
          </button>
          <a
            href={`tel:${info.phone_primary_tel}`}
            className={styles.phone}
            data-testid="product-cta-phone"
          >
            {info.phone_primary}
          </a>
        </div>
      </div>

      {/* 24-год SLA badge — bottom-left, dark green frosted glass.
          Same look as the badge on /contacts page (per Figma). */}
      <div
        className={styles.badge}
        data-testid="product-cta-badge"
        aria-label="Середній час відповіді нашого консультанта — 24 години"
      >
        <span className={styles.badgeIcon}>
          <IconClockWhite />
        </span>
        <span className={styles.badgeText}>
          <span className={styles.badgeBig}>24 год</span>
          <span className={styles.badgeSub}>
            Середній час відповіді нашого консультанта
          </span>
        </span>
      </div>
    </section>
  );
};

export default CtaSection1;
