import React from "react";
import styles from "./fire1.module.css";

export type Fire1Type = {
  className?: string;
  showFire?: boolean;
  /** Variant props */
  size?: any;
};

const Fire1: React.FC<Fire1Type> = ({
  className = "",
  size = 16,
  showFire,
}) => {
  if (showFire === false) return null;
  return (
    <span
      className={[styles.iconFire, className].join(" ")}
      data-size={size}
      aria-hidden="true"
    >
      <img loading="lazy" decoding="async"
        className={styles.img}
        src="/tag-fire.png"
        width={11}
        height={14}
        alt=""
      />
    </span>
  );
};

export default Fire1;
