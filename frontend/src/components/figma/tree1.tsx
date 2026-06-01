import React from "react";
import { type CSSProperties } from "react";
import styles from "./tree1.module.css";

export type Tree1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Tree1: React.FC<Tree1Type> = ({ className = "", size = 36 }) => {
  return (
    <div className={[styles.rightIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={50}
        height={50}
        alt=""
        src="/Vector20.svg"
      />
    </div>
  );
};

export default Tree1;
