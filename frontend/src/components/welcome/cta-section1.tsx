import React from "react";
import { useCallbackModal } from "../../context/CallbackContext";
import { useContactInfo } from "../../context/ContactInfoContext";
import styles from "./cta-section1.module.css";

export type CtaSection1Type = {
  className?: string;
};

const CtaSection1: React.FC<CtaSection1Type> = ({ className = "" }) => {
  const { openModal: openCallback } = useCallbackModal();
  const { info } = useContactInfo();
  return (
    <section
      className={[styles.ctaSection, className].join(" ")}
      data-testid="cta-no-product"
    >
      <img loading="lazy" decoding="async"
        className={styles.bg}
        width={1921}
        height={1206}
        alt=""
        src="/image-7@2x.webp"
      />
      <div className={styles.darkOverlay} aria-hidden="true" />

      <div className={styles.mainColumn}>
        <h2 className={styles.title}>
          Не знайшли
          <br />
          ваш препарат?
        </h2>
        <p className={styles.subtitle}>
          Ми безкоштовно підберемо схему захисту під вашу культуру.
        </p>
        <button
          type="button"
          className={styles.cta}
          data-testid="cta-consult-btn"
          onClick={openCallback}
        >
          Отримати консультацію
        </button>
      </div>

      <a
        href={`tel:${info.phone_primary_tel}`}
        className={styles.phone}
        data-testid="cta-phone"
      >
        {info.phone_primary}
      </a>
    </section>
  );
};

export default CtaSection1;
