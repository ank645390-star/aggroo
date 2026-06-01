import React from "react";
import styles from "./wheat1.module.css";

export type Wheat1Type = {
  className?: string;
  /** Variant props */
  size?: any;
};

const Wheat1: React.FC<Wheat1Type> = ({ className = "", size = 16 }) => {
  return (
    <span
      className={[styles.iconWheat, className].join(" ")}
      data-size={size}
      aria-hidden="true"
    >
      <img loading="lazy" decoding="async"
        className={styles.img}
        src="/tag-wheat.png"
        width={16}
        height={16}
        alt=""
      />
    </span>
  );
};

export default Wheat1;
