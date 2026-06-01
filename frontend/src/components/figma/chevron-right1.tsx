import React from "react";
import { type CSSProperties } from "react";
import styles from "./chevron-right1.module.css";

export type ChevronRight1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const ChevronRight1: React.FC<ChevronRight1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <div
      className={[styles.iconChevronRight, className].join(" ")}
      data-size={size}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={4.6}
        height={9.2}
        alt=""
        src="/Vector23.svg"
      />
    </div>
  );
};

export default ChevronRight1;
