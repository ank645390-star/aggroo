import React from "react";
import styles from "./logistics-section.module.css";

export type LogisticsSectionType = {
  className?: string;
};

/**
 * Section: «Логістика живих рішень»
 *
 * Figma spec (audited from screenshots):
 *   - Outer frame:           1920 × 1372  (dark green #003214)
 *   - Heading frame:         1664 × 144   (top, "ЛОГІСТИКА ЖИВИХ РІШЕНЬ")
 *   - Center plant image:    1013 × 803   (cryogenic seed)
 *   - Dashed elliptical orbit around the image
 *   - 4 corner feature blocks (472 × 123 each, gap 8px)
 *   - Floating tags 40px-tall ("Активне" 143×40, "+4.3°C" 89×40, "Біобезпечне" 106×40)
 *   - Round "A" badge on the bottom-right of plant image
 *
 * Typography:
 *   - Heading: Golos Display Bold (120 / 120%)  + Commissioner secondary (120 / 110%)
 *   - Feature heading: Golos Display Bold (28 / 120%)
 *   - Feature label-top: Golos Body Regular (16)
 *   - Tag-chip body: Golos Body (18)
 */
const LogisticsSection: React.FC<LogisticsSectionType> = ({ className = "" }) => {
  return (
    <section className={[styles.section, className].join(" ")}>
      {/* ===== HEADING (1664 × 144) ===== */}
      <div className={styles.heading}>
        <span className={styles.headingPrimary}>Логістика</span>
        <span className={styles.headingGap}>&nbsp;</span>
        <span className={styles.headingSecondary}>живих рішень</span>
      </div>

      {/* ===== STAGE (1664 wide, contains image + ellipse + features + tags) ===== */}
      <div className={styles.stage}>
        {/* Dashed orbit ellipse */}
        <div className={styles.orbit} aria-hidden="true" />

        {/* Center plant animation video — chromakey is handled in CSS via mix-blend-mode + radial mask */}
        <video
          className={styles.plant}
          src="/bubble-anim.mp4"
          poster="/bubble-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="Заморожений паросток у краплі — символ живих рішень"
        />

        {/* ===== Feature blocks: 4 corners (472 × 123 Hug, gap 8 between icon and text) ===== */}
        {/* Top-left — Цифрові датчики (clipboard icon), icon on LEFT */}
        <div className={[styles.feature, styles.topLeft].join(" ")}>
          <div className={styles.featureRow}>
            <img loading="lazy" decoding="async"
              className={styles.featureIconImg}
              src="/icon-passport.svg"
              alt=""
              width={60}
              height={60}
            />
            <div className={styles.featureText}>
              <div className={styles.featureLabelTop}>Цифрові датчики</div>
              <div className={styles.featureLabelBottom}>
                Цілодобовий моніторинг<br />температури
              </div>
            </div>
          </div>
        </div>

        {/* Top-right — Холодильні камери (nodes icon), icon on RIGHT */}
        <div className={[styles.feature, styles.topRight].join(" ")}>
          <div className={styles.featureRow}>
            <div className={[styles.featureText, styles.alignEnd].join(" ")}>
              <div className={styles.featureLabelTop}>Холодильні камери</div>
              <div className={styles.featureLabelBottom}>
                Власне обладнання<br />на виробництві
              </div>
            </div>
            <img loading="lazy" decoding="async"
              className={styles.featureIconImg}
              src="/icon-nodes.svg"
              alt=""
              width={60}
              height={60}
            />
          </div>
        </div>

        {/* Bottom-left — Контрольоване транспортування (truck icon), icon on LEFT */}
        <div className={[styles.feature, styles.bottomLeft].join(" ")}>
          <div className={styles.featureRow}>
            <img loading="lazy" decoding="async"
              className={styles.featureIconImg}
              src="/icon-truck.svg"
              alt=""
              width={60}
              height={60}
            />
            <div className={styles.featureText}>
              <div className={styles.featureLabelTop}>Контрольоване транспортування</div>
              <div className={styles.featureLabelBottom}>
                Збереження cold-chain<br />на всіх етапах
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-right — Паспорт зберігання (thermometer icon), icon on RIGHT */}
        <div className={[styles.feature, styles.bottomRight].join(" ")}>
          <div className={styles.featureRow}>
            <div className={[styles.featureText, styles.alignEnd].join(" ")}>
              <div className={styles.featureLabelTop}>Паспорт зберігання</div>
              <div className={styles.featureLabelBottom}>
                Історія температур<br />кожної партії
              </div>
            </div>
            <img loading="lazy" decoding="async"
              className={styles.featureIconImg}
              src="/icon-thermometer.png"
              alt=""
              width={60}
              height={60}
            />
          </div>
        </div>

        {/* ===== Floating tag chips (40px height) ===== */}
        <div className={[styles.tag, styles.tagActive].join(" ")}>Активне</div>
        <div className={[styles.tag, styles.tagTemp].join(" ")}>+4.3°C</div>
        <div className={[styles.tag, styles.tagBio].join(" ")}>Біобезпечне</div>
      </div>
    </section>
  );
};

export default LogisticsSection;
