import React from "react";
import { type CSSProperties } from "react";
import styles from "./truck1.module.css";

export type Truck1Type = {
  className?: string;
  showLeftIcon?: boolean;

  /** Variant props */
  size?: any;
};

const Truck1: React.FC<Truck1Type> = ({
  className = "",
  size = 16,
  showLeftIcon,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={55}
        height={35}
        alt=""
        src="/Vector19.svg"
      />
    </div>
  );
};

export default Truck1;
