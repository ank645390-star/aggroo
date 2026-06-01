import React from "react";
import styles from "./drop1.module.css";

export type Drop1Type = {
  className?: string;
  /** Variant props */
  size?: any;
};

/**
 * Drop icon — used near the "Норма" label on product cards.
 * Replaced legacy Vector8.svg (calendar-like glyph) with a proper
 * inline teardrop silhouette so the meaning ("dosage rate") is
 * communicated visually.
 */
const Drop1: React.FC<Drop1Type> = ({ className = "", size = 16 }) => {
  const px = typeof size === "number" ? size : parseInt(String(size), 10) || 16;
  return (
    <div
      className={[styles.iconDrop, className].join(" ")}
      data-size={size}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        className={styles.vectorIcon}
        width={px}
        height={px}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Teardrop outline */}
        <path
          d="M8 1.6c1.6 2.1 4.6 5.6 4.6 8.4a4.6 4.6 0 0 1-9.2 0c0-2.8 3-6.3 4.6-8.4Z"
          stroke="#1B4332"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Inner highlight curve */}
        <path
          d="M6 10.6c0 1.05.84 1.9 1.9 1.9"
          stroke="#1B4332"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Drop1;
