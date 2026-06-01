import React from "react";
import { type CSSProperties } from "react";
import ChevronLeft1 from "./chevron-left1";
import styles from "./button-arrow-left1.module.css";

export type ButtonArrowLeft1Type = {
  className?: string;
  size1?: any;

  /** Variant props */
  size?: any;
  state?: any;
};

const ButtonArrowLeft1: React.FC<ButtonArrowLeft1Type> = ({
  className = "",
  size = "Large",
  state = "Default",
  size1 = 20,
}) => {
  return (
    <div
      className={[styles.buttonArrowLeft, className].join(" ")}
      data-size={size}
      data-state={state}
    >
      <ChevronLeft1 size={size1} />
    </div>
  );
};

export default ButtonArrowLeft1;
