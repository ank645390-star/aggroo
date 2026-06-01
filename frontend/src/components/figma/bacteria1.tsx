import React from "react";
import { type CSSProperties } from "react";
import styles from "./bacteria1.module.css";

export type Bacteria1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Bacteria1: React.FC<Bacteria1Type> = ({ className = "", size = 16 }) => {
  return (
    <div
      className={[styles.iconBacteria, className].join(" ")}
      data-size={size}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={19.2}
        height={16.7}
        alt=""
        src="/Vector9.svg"
      />
    </div>
  );
};

export default Bacteria1;
