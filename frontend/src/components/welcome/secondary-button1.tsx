import React from "react";
import { type CSSProperties } from "react";
import styles from "./secondary-button1.module.css";

export type SecondaryButton1Type = {
  className?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;

  /** Variant props */
  state?: any;
  type?: any;
};

const SecondaryButton1: React.FC<SecondaryButton1Type> = ({
  className = "",
  state = "Default",
  type = "Filled",
  showIcon = true,
  icon,
}) => {
  return (
    <button
      className={[styles.secondaryButton, className].join(" ")}
      data-state={state}
      data-type={type}
    >
      {!!showIcon && (
        <div className={styles.root}>
          {!!showIcon && icon}
        </div>
      )}
      <div className={styles.div}>Замовити дзвінок</div>
    </button>
  );
};

export default SecondaryButton1;
