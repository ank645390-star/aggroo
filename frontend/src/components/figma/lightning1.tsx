import React from "react";
import { type CSSProperties } from "react";
import styles from "./lightning1.module.css";

export type Lightning1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Lightning1: React.FC<Lightning1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={18}
        height={30}
        alt=""
        src="/Vector14.svg"
      />
    </div>
  );
};

export default Lightning1;
