import React from "react";
import { type CSSProperties } from "react";
import styles from "./chevron-left1.module.css";

export type ChevronLeft1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const ChevronLeft1: React.FC<ChevronLeft1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <div
      className={[styles.iconChevronLeft, className].join(" ")}
      data-size={size}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={4.6}
        height={9.2}
        alt=""
        src="/Vector22.svg"
      />
    </div>
  );
};

export default ChevronLeft1;
