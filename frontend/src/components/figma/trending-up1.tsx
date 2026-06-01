import React from "react";
import { type CSSProperties } from "react";
import styles from "./trending-up1.module.css";

export type TrendingUp1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const TrendingUp1: React.FC<TrendingUp1Type> = ({
  className = "",
  size = 36,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={41.3}
        height={21.3}
        alt=""
        src="/Vector17.svg"
      />
    </div>
  );
};

export default TrendingUp1;
