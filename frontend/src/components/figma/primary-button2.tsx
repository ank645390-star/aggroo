import React from "react";
import { type CSSProperties } from "react";
import ArrowRight1 from "./arrow-right1";
import styles from "./primary-button2.module.css";

export type PrimaryButton2Type = {
  className?: string;
  showLabel?: boolean;
  size2?: any;

  /** Variant props */
  state?: any;
  type?: any;
};

const PrimaryButton2: React.FC<PrimaryButton2Type> = ({
  className = "",
  state = "Default",
  type = "Filled",
  showLabel = true,
  size2 = 24,
}) => {
  return (
    <div
      className={[styles.primaryButton, className].join(" ")}
      data-state={state}
      data-type={type}
    >
      {!!showLabel && <div className={styles.div}>Додати в кошик</div>}
      <div className={styles.iconContainer}>
        <ArrowRight1 size={size2} />
      </div>
    </div>
  );
};

export default PrimaryButton2;
