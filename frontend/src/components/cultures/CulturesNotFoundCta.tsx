import React from "react";
import styles from "./CulturesNotFoundCta.module.css";
import { useCallbackModal } from "../../context/CallbackContext";
import { useContactInfo } from "../../context/ContactInfoContext";

/* =============================================================================
 *  CulturesNotFoundCta
 *  -------------------------------------------------------------------------
 *  Точна копія блоку "Не знайшли своє рішення?" з /contacts (контактна
 *  секція consultationSection). Єдина різниця — текст заголовка:
 *      • /contacts  →  "Не знайшли своє рішення?"
 *      • /cultures  →  "Не знайшли вашу культуру?"
 *  Усе інше (BG-фото, cream-градієнт, плашка 24-год, опис, зелена кнопка
 *  «Отримати консультацію», номер телефону) — повністю успадковано з
 *  існуючої реалізації контактів, тож дизайн-система узгоджена pixel-perfect.
 * ========================================================================== */

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

const IconCallSmall: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M21.97 18.33a2.5 2.5 0 0 1-2.5 2.5C9.95 20.83 3.17 14.05 3.17 4.53a2.5 2.5 0 0 1 2.5-2.5h2.5a1 1 0 0 1 1 .79l.95 4.27a1 1 0 0 1-.27.93l-1.7 1.7a14.5 14.5 0 0 0 6.13 6.13l1.7-1.7a1 1 0 0 1 .93-.27l4.27.95a1 1 0 0 1 .79 1v2.5Z"
      stroke="#fff"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const CulturesNotFoundCta: React.FC = () => {
  const { openModal: openCallback } = useCallbackModal();
  const { info } = useContactInfo();

  return (
    <section
      className={styles.consultationSection}
      data-testid="cultures-not-found-cta"
    >
      <div className={styles.consultationTitleWrap}>
        <h2
          className={styles.consultationTitle}
          data-testid="cultures-not-found-cta-title"
        >
          <span className={styles.consultTitleStrong}>Не знайшли </span>
          <span className={styles.consultTitleMuted}>вашу культуру</span>
          <span className={styles.consultTitleMuted}>?</span>
        </h2>
      </div>

      <div className={styles.consultationBgBlock}>
        <div className={styles.consultationContent}>
          <div
            className={styles.featureBlock}
            data-testid="cultures-not-found-cta-badge"
            aria-label="Середній час відповіді нашого консультанта — 24 години"
          >
            <div className={styles.featureIcon}>
              <IconClockWhite />
            </div>
            <div className={styles.featureText}>
              <div className={styles.featureBig}>24 год</div>
              <div className={styles.featureSub}>
                Середній час відповіді нашого консультанта
              </div>
            </div>
          </div>

          <div className={styles.textBlock}>
            <div
              className={styles.consultationText}
              data-testid="cultures-not-found-cta-desc"
            >
              <span>Опишіть культуру та задачу — ми підготуємо безкоштовно </span>
              <b className={styles.consultationBold}>
                індивідуальну схему біозахисту
              </b>
              <span> з розрахунком витрат на ваші угіддя.</span>
            </div>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={openCallback}
                data-testid="cultures-not-found-cta-button"
              >
                Отримати консультацію
                <IconCallSmall />
              </button>
              <div className={styles.phoneText}>
                <a
                  href={`tel:${info.phone_primary_tel}`}
                  className={styles.phoneLink}
                  data-testid="cultures-not-found-cta-phone"
                >
                  {info.phone_primary}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CulturesNotFoundCta;
