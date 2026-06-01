import React from "react";
import RevealHeading from "./reveal-heading";
import RevealBlock from "./reveal-block";
import FeatureBlock1 from "./feature-block1";
import styles from "./mission-section1.module.css";

export type MissionSection1Type = {
  className?: string;
};

const MissionSection1: React.FC<MissionSection1Type> = ({ className = "" }) => {
  // Continuous left-to-right stagger across all three headline lines
  // so they read as one choreographed reveal.
  // line1 "+20 років"             — 2 words   → next starts at 2 * 80 = 160
  // line2 "ми створюємо комплексні" — 3 words → next starts at 5 * 80 = 400
  // line3 "біологічні рішення для українських полів." — 5 words
  return (
    <div className={[styles.missionSection, className].join(" ")}>
      <img loading="lazy" decoding="async"
        className={styles.imageIcon}
        alt=""
        src="/image2@2x.webp"
      />

      {/* Soft wind/light haze drifting horizontally — додає "живість"
          атмосфери без зачіпання дерева. Деактивовано при
          prefers-reduced-motion. */}
      <div className={styles.windHaze} aria-hidden="true" />

      <div className={styles.overlay} />

      {/* +20 РОКІВ */}
      <RevealHeading
        as="h2"
        className={styles.years}
        block
        baseDelay={100}
        stagger={80}
        lines={[[{ text: "+20 років" }]]}
      />

      {/* МИ СТВОРЮЄМО КОМПЛЕКСНІ */}
      <RevealHeading
        as="h2"
        className={styles.headingLine1}
        block
        baseDelay={100 + 2 * 80}
        stagger={80}
        lines={[[{ text: "ми створюємо комплексні" }]]}
      />

      {/* БІОЛОГІЧНІ РІШЕННЯ ДЛЯ УКРАЇНСЬКИХ ПОЛІВ. */}
      <RevealHeading
        as="h2"
        className={styles.headingLine2}
        block
        baseDelay={100 + 5 * 80}
        stagger={80}
        lines={[[{ text: "біологічні рішення для\u00A0\u00A0українських полів." }]]}
      />

      {/* Body paragraphs — simple block fade-in (no per-word reveal).
          Two blocks fade in sequentially ("раз, два") for a calm,
          editorial cadence. */}
      <RevealBlock as="p" className={styles.paragraphLeft} delay={0}>
        «Таміс Агро» м'яко інтегрує <strong>мікробіологію</strong> у ваші звичні
        технології вирощування.
        <br /><br />
        Ми допомагаємо отримувати <strong>стабільно високі врожаї</strong>,
        зберігаючи природну родючість ґрунту та екологічну рівновагу.
      </RevealBlock>

      <RevealBlock as="p" className={styles.paragraphRight} delay={120}>
        Урожай, вирощений із застосуванням мікробіологічних продуктів,{" "}
        <strong>безпечний для людей, тварин і корисний для довкілля</strong>.
      </RevealBlock>

      <div className={styles.featureBlockWrapper}>
        <FeatureBlock1 label="Суворий температурний контроль кожної партії препаратів" />
      </div>
    </div>
  );
};

export default MissionSection1;
