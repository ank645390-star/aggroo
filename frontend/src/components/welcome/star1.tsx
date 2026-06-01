import React from "react";
import { type CSSProperties } from "react";
import styles from "./star1.module.css";

export type Star1Type = {
  className?: string;
  star: string;

  /** Variant props */
  size?: any;
};

const Star1: React.FC<Star1Type> = ({ className = "", size = 16, star }) => {
  return (
    <div className={[styles.iconStar, className].join(" ")} data-size={size}>
      <img decoding="async"
        className={styles.iconStarChild}
        loading="lazy"
        width={16}
        height={16}
        alt=""
        src={star}
      />
    </div>
  );
};

export default Star1;
