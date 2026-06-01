import React from "react";
import { type CSSProperties } from "react";
import styles from "./arrow-right1.module.css";

export type ArrowRight1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const ArrowRight1: React.FC<ArrowRight1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <div
      className={[styles.iconArrowRight, className].join(" ")}
      data-size={size}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={14.3}
        height={11}
        alt=""
        src="/Vector21.svg"
      />
    </div>
  );
};

export default ArrowRight1;
