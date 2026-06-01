import React from "react";
import { type CSSProperties } from "react";
import styles from "./wheat1.module.css";

export type Wheat1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Wheat1: React.FC<Wheat1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconWheat, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={7}
        height={14.5}
        alt=""
        src="/Vector24.svg"
      />
    </div>
  );
};

export default Wheat1;
