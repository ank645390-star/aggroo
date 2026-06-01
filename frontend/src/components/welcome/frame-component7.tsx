import React from "react";
import Navbar1 from "../figma/navbar1";
import styles from "./frame-component7.module.css";

export type FrameComponent7Type = {
  className?: string;
};

/**
 * Hero block — Welcome page #1 section.
 *
 * Layers (z-order, back → front):
 *   1. heroSection         (background image: hero-bg-new.webp)
 *   2. heroOverlay         (subtle radial vignette for legibility)
 *   3. watermarkIcon       (TAMIS leaf X-mark, opacity 0.32)
 *   4. plantIcon           (real plant sprout PNG, key-out)
 *   5. heroTitle / heroSubtitle   (cream typography)
 *   6. navbar               (above all)
 *
 * Animation choreography:
 *   Each word renders inside a `.wordInner` span which simultaneously:
 *     a) clip-path reveals L→R         (inset right 100% → 0)
 *     b) translate3d(-8%, 80%) → (0,0) (bottom-left → natural pos)
 *     c) opacity 0 → 1
 *   over 1.0s on `cubic-bezier(0.22, 0.61, 0.36, 1)`.
 *   Stagger is left-to-right across all 10 words of the hero text:
 *     "Час біорішень" → "Настав" → "Майбутнє в новій силі твоєї землі"
 *
 *   This produces the diagonal bottom-left → top-right "growing" reveal
 *   the design calls for (Studio Namma / x2ycreative style entrance).
 */

const splitWords = (phrase: string, startIndex: number) =>
  phrase.split(/\s+/).map((w, i) => ({ word: w, idx: startIndex + i }));

const FrameComponent7: React.FC<FrameComponent7Type> = ({ className = "" }) => {
  const line1 = splitWords("Час біорішень", 0);
  const line2 = splitWords("Настав", line1.length);
  const subtitle = splitWords(
    "Майбутнє в новій силі твоєї землі",
    line1.length + line2.length,
  );

  // Per-word delay so the reveal travels left-to-right across the
  // whole hero (10 words total).
  const stagger = 0.09;
  // Wait for the plant + watermark to settle before headline starts.
  const baseDelay = 0.45;

  const wordStyle = (idx: number): React.CSSProperties => ({
    animationDelay: `${baseDelay + idx * stagger}s`,
  });

  return (
    <section className={[styles.heroSectionWrapper, className].join(" ")}>
      <div className={styles.heroSection}>
        {/* Subtle dark vignette — keeps cream typography legible on
            the lighter bokeh while preserving photographic feel. */}
        <div className={styles.heroOverlay} aria-hidden="true" />

        {/* TAMIS leaf watermark (decorative X-mark behind everything). */}
        <img
          className={styles.watermarkIcon}
          width={1132}
          height={872}
          alt=""
          src="/watermark.svg"
          aria-hidden="true"
        />

        {/* Real plant sprout — central focal piece, rooted in the soil. */}
        <img
          className={styles.plantIcon}
          width={862}
          height={1039}
          alt=""
          src="/hero-plant.webp"
          aria-hidden="true"
        />

        {/* HERO HEADLINE */}
        <h1 className={styles.heroTitle} data-testid="hero-title">
          <span className={styles.heroTitleLine}>
            {line1.map(({ word, idx }) => (
              <span key={`l1-${idx}`} className={styles.wordInner} style={wordStyle(idx)}>
                {word}
              </span>
            ))}
          </span>
          <span className={styles.heroTitleLine}>
            {line2.map(({ word, idx }) => (
              <span key={`l2-${idx}`} className={styles.wordInner} style={wordStyle(idx)}>
                {word}
              </span>
            ))}
          </span>
        </h1>

        {/* SUBTITLE — same reveal pattern, continues the left-to-right
            stagger so the whole hero feels like one choreographed
            entrance. */}
        <h2 className={styles.heroSubtitle} data-testid="hero-subtitle">
          {subtitle.map(({ word, idx }) => (
            <span key={`sub-${idx}`} className={styles.wordInner} style={wordStyle(idx)}>
              {word}
            </span>
          ))}
        </h2>

        {/* Header / Navbar */}
        <Navbar1
          device="Desktop"
          state="Default"
          size="20"
          size1="20"
          size2="24"
        />
      </div>
    </section>
  );
};

export default FrameComponent7;
