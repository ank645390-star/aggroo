import React from "react";
import { type CSSProperties } from "react";
import ButtonArrowLeft1 from "./button-arrow-left1";
import ButtonArrowRight1 from "./button-arrow-right1";
import styles from "./arrow-switcher1.module.css";

export type ArrowSwitcher1Type = {
  className?: string;
  size1?: any;
  state?: any;
  size2?: any;
  state1?: any;

  /** Variant props */
  active?: any;
  size?: any;
};

const ArrowSwitcher1: React.FC<ArrowSwitcher1Type> = ({
  className = "",
  active = "Left",
  size = "Large",
  size1,
  state,
  size2,
  state1,
}) => {
  return (
    <div
      className={[styles.arrowSwitcher, className].join(" ")}
      data-active={active}
      data-size={size}
    >
      <ButtonArrowLeft1 size={size1} state={state} size1="20" />
      <ButtonArrowRight1 size={size2} state={state1} size1="20" />
    </div>
  );
};

export default ArrowSwitcher1;
