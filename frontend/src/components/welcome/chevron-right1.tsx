import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./chevron-right1.module.css";

export type ChevronRight1Type = {
  className?: string;

  /** Variant props */
  size?: any;

  /** Style props */
  chevronRightHeight?: any;
  chevronRightWidth?: any;
};

const ChevronRight1: React.FC<ChevronRight1Type> = ({
  className = "",
  size = 16,
  chevronRightHeight,
  chevronRightWidth,
}) => {
  const chevronRightStyle: CSSProperties = useMemo(() => {
    return {
      height: chevronRightHeight,
      width: chevronRightWidth,
    };
  }, [chevronRightHeight, chevronRightWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={chevronRightStyle}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={8.4}
        height={16.9}
        alt=""
        src="/Vector10.svg"
      />
    </div>
  );
};

export default ChevronRight1;
