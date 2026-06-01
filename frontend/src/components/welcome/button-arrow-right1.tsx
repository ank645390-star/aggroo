import React from "react";
import { useMemo, type CSSProperties } from "react";
import ChevronRight1 from "./chevron-right1";
import styles from "./button-arrow-right1.module.css";

export type ButtonArrowRight1Type = {
  className?: string;
  size1?: any;
  chevronRightHeight?: any;
  chevronRightWidth?: any;

  /** Variant props */
  size?: any;
  state?: any;

  /** Style props */
  buttonArrowRightHeight?: any;
  buttonArrowRightWidth?: any;
};

const ButtonArrowRight1: React.FC<ButtonArrowRight1Type> = ({
  className = "",
  size = "Large",
  state = "Default",
  buttonArrowRightHeight,
  buttonArrowRightWidth,
  size1 = 16,
  chevronRightHeight,
  chevronRightWidth,
}) => {
  const buttonArrowRightStyle: CSSProperties = useMemo(() => {
    return {
      height: buttonArrowRightHeight,
      width: buttonArrowRightWidth,
    };
  }, [buttonArrowRightHeight, buttonArrowRightWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      data-state={state}
      style={buttonArrowRightStyle}
    >
      <ChevronRight1
        size={size1}
        chevronRightHeight={chevronRightHeight}
        chevronRightWidth={chevronRightWidth}
      />
    </div>
  );
};

export default ButtonArrowRight1;
