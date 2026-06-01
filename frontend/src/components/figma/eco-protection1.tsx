import React from "react";
import { type CSSProperties } from "react";
import styles from "./eco-protection1.module.css";

export type EcoProtection1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const EcoProtection1: React.FC<EcoProtection1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={31.1}
        height={27.8}
        alt=""
        src="/Vector15.svg"
      />
    </div>
  );
};

export default EcoProtection1;
