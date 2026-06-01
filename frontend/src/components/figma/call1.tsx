import React from "react";
import { type CSSProperties } from "react";
import styles from "./call1.module.css";

export type Call1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Call1: React.FC<Call1Type> = ({ className = "", size = 20 }) => {
  return (
    <div className={[styles.iconCall, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={19}
        height={19}
        alt=""
        src="/Vector3.svg"
      />
    </div>
  );
};

export default Call1;
