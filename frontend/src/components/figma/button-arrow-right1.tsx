import React from "react";
import { type CSSProperties } from "react";
import ChevronRight1 from "./chevron-right1";
import styles from "./button-arrow-right1.module.css";

export type ButtonArrowRight1Type = {
  className?: string;
  size1?: any;

  /** Variant props */
  size?: any;
  state?: any;
};

const ButtonArrowRight1: React.FC<ButtonArrowRight1Type> = ({
  className = "",
  size = "Large",
  state = "Default",
  size1 = 20,
}) => {
  return (
    <div
      className={[styles.buttonArrowRight, className].join(" ")}
      data-size={size}
      data-state={state}
    >
      <ChevronRight1 size={size1} />
    </div>
  );
};

export default ButtonArrowRight1;
