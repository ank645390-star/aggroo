import React from "react";
import styles from "./frame-component8.module.css";

export type FrameComponent8Type = {
  className?: string;
};

/**
 * Section: «Ми не просто виробляємо препарати»
 *
 * Pixel-perfect композиція з Figma. Геометрія всередині секції (1920×1484):
 *   • Heading (left 120, top 120, right 120, font 82 Golos 600 / Commissioner 400 grey)
 *   • Description «Кожен продукт…» (left 976, top 470, right 120, font 28 Golos)
 *   • Field photo: ts_image0.webp (left 0, top 415, w 981, h 1302) -- зліва, повна висота
 *   • Green panel #ACB14F (left 966, top 720, w 954, h 691) -- справа
 *   • Texture overlay ts_image1.jpeg (поверх зеленого, opacity 5%) -- декоративна
 *   • Canisters: ts_image2.webp (left 477, top 573, w 838, h 911) -- по центру,
 *     перекриває поле і зелений блок
 *   • Feature stack (поверх зеленого блока, right-anchored):
 *       — 100% органічно (leaf icon)
 *       — +30% приріст (trending icon)
 *       — 2 роки (shield icon)
 *     Текст cream (#F9F7F2), Commissioner H3 / Golos Body Large 28
 */
const FrameComponent8: React.FC<FrameComponent8Type> = ({ className = "" }) => {
  return (
    <section
      className={[styles.parent, className].join(" ")}
      role="region"
      aria-labelledby="trust-heading"
    >
      {/* ===== Field photo (left side) ===== */}
      <img loading="lazy" decoding="async"
        className={styles.fieldImage}
        src="/ts_image0.webp"
        alt="Поле пшениці на світанку"
        draggable={false}
      />

      {/* ===== Green panel (right side) ===== */}
      <div className={styles.greenPanel}>
        <img loading="lazy" decoding="async"
          className={styles.greenTexture}
          src="/ts_image1.jpeg"
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      </div>

      {/* ===== Canisters (centered, overlapping field + green panel) ===== */}
      <img loading="lazy" decoding="async"
        className={styles.canisters}
        src="/ts_canisters.webp"
        alt="Каністра 1 л і пляшка 0.5 л біопрепарату Таміс Агро"
        draggable={false}
      />

      {/* ===== Heading ===== */}
      <h1 id="trust-heading" className={styles.h1}>
        <span className={styles.headingBlack}>
          «Ми не просто виробляємо препарати
        </span>
        <span className={styles.headingGrey}>
          {" "}- ми відновлюємо природний баланс ґрунту та рослин»
        </span>
      </h1>

      {/* ===== Description ===== */}
      <p className={styles.description}>
        <span>Кожен продукт Таміс Агро створений на основі </span>
        <b>живих мікроорганізмів</b>
        <span>, що працюють у гармонії з природою. </span>
        <b>Без агресивної хімії</b>
        <span>. Без компромісів з якістю.</span>
      </p>

      {/* ===== Feature stack on green panel ===== */}
      <div className={styles.featureStack}>
        <div className={styles.feature}>
          <div className={styles.featureRow}>
            <img loading="lazy" decoding="async"
              className={styles.featureIcon}
              src="/icon-leaf.svg"
              alt=""
              width={60}
              height={60}
              draggable={false}
            />
            <h3 className={styles.featureTitle}>100% органічно</h3>
          </div>
          <p className={styles.featureBody}>
            Біологічний склад без синтетичних компонентів
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureRow}>
            <img loading="lazy" decoding="async"
              className={styles.featureIcon}
              src="/icon-trending.svg"
              alt=""
              width={60}
              height={60}
              draggable={false}
            />
            <h3 className={styles.featureTitle}>+30% приріст</h3>
          </div>
          <p className={styles.featureBody}>
            Підвищення врожайності вже у перший сезон
          </p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureRow}>
            <img loading="lazy" decoding="async"
              className={styles.featureIcon}
              src="/icon-shield.svg"
              alt=""
              width={60}
              height={60}
              draggable={false}
            />
            <h3 className={styles.featureTitle}>2 роки</h3>
          </div>
          <p className={styles.featureBody}>
            Гарантований термін зберігання препарату
          </p>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent8;
