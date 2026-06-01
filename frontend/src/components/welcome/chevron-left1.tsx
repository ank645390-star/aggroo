import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./chevron-left1.module.css";

export type ChevronLeft1Type = {
  className?: string;

  /** Variant props */
  size?: any;

  /** Style props */
  chevronLeftHeight?: any;
  chevronLeftWidth?: any;
};

const ChevronLeft1: React.FC<ChevronLeft1Type> = ({
  className = "",
  size = 16,
  chevronLeftHeight,
  chevronLeftWidth,
}) => {
  const chevronLeftStyle: CSSProperties = useMemo(() => {
    return {
      height: chevronLeftHeight,
      width: chevronLeftWidth,
    };
  }, [chevronLeftHeight, chevronLeftWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={chevronLeftStyle}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={8.4}
        height={16.9}
        alt=""
        src="/Vector9.svg"
      />
    </div>
  );
};

export default ChevronLeft1;
