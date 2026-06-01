import React from "react";
import { type CSSProperties } from "react";
import styles from "./temperature1.module.css";

export type Temperature1Type = {
  className?: string;
  showLeftIcon?: boolean;

  /** Variant props */
  size?: any;
};

const Temperature1: React.FC<Temperature1Type> = ({
  className = "",
  size = 20,
  showLeftIcon,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={24}
        height={48}
        alt=""
        src="/Vector4.svg"
      />
    </div>
  );
};

export default Temperature1;
