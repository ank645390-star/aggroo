import React from "react";
import { type CSSProperties } from "react";
import styles from "./clock1.module.css";

export type Clock1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Clock1: React.FC<Clock1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconClock, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={16.7}
        height={16.7}
        alt=""
        src="/Vector13.svg"
      />
    </div>
  );
};

export default Clock1;
