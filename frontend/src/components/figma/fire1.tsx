import React from "react";
import { type CSSProperties } from "react";
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
  return (
    !!showFire && (
      <div className={[styles.iconFire, className].join(" ")} data-size={size}>
        <img loading="lazy" decoding="async"
          className={styles.vectorIcon}
          width={11}
          height={14}
          alt=""
          src="/Vector4.svg"
        />
      </div>
    )
  );
};

export default Fire1;
