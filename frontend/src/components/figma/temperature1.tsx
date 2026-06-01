import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./temperature1.module.css";

export type Temperature1Type = {
  className?: string;
  /** Variant props */
  size?: any;
  /** Style props */
  temperatureHeight?: any;
  temperatureWidth?: any;
};

/**
 * Temperature / storage icon.
 *
 * Replaced legacy /Vector7.svg (which was a generic `+` glyph rendered in
 * pure white — invisible on the yellow feature card) with a proper inline
 * thermometer SVG. The icon inherits color from `currentColor` so we can
 * theme it through CSS (dark in feature card, white on dark surfaces).
 */
const Temperature1: React.FC<Temperature1Type> = ({
  className = "",
  size = 20,
  temperatureHeight,
  temperatureWidth,
}) => {
  const temperatureStyle: CSSProperties = useMemo(() => {
    return {
      height: temperatureHeight,
      width: temperatureWidth,
    };
  }, [temperatureHeight, temperatureWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={temperatureStyle}
    >
      <svg
        className={styles.vectorIcon}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M11.5 11.34V4.5a1.5 1.5 0 1 0-3 0v6.84a3.25 3.25 0 1 0 3 0Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="13.75" r="1.25" fill="currentColor" />
      </svg>
    </div>
  );
};

export default Temperature1;
