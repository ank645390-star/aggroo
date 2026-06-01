import React from "react";
import { type CSSProperties } from "react";
import styles from "./leaf1.module.css";

export type Leaf1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Leaf1: React.FC<Leaf1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={49.3}
        height={34}
        alt=""
        src="/Vector16.svg"
      />
    </div>
  );
};

export default Leaf1;
