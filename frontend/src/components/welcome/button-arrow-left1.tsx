import React from "react";
import { useMemo, type CSSProperties } from "react";
import ChevronLeft1 from "./chevron-left1";
import styles from "./button-arrow-left1.module.css";

export type ButtonArrowLeft1Type = {
  className?: string;
  size1?: any;
  chevronLeftHeight?: any;
  chevronLeftWidth?: any;

  /** Variant props */
  size?: any;
  state?: any;

  /** Style props */
  buttonArrowLeftHeight?: any;
  buttonArrowLeftWidth?: any;
};

const ButtonArrowLeft1: React.FC<ButtonArrowLeft1Type> = ({
  className = "",
  size = "Large",
  state = "Default",
  buttonArrowLeftHeight,
  buttonArrowLeftWidth,
  size1 = 16,
  chevronLeftHeight,
  chevronLeftWidth,
}) => {
  const buttonArrowLeftStyle: CSSProperties = useMemo(() => {
    return {
      height: buttonArrowLeftHeight,
      width: buttonArrowLeftWidth,
    };
  }, [buttonArrowLeftHeight, buttonArrowLeftWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      data-state={state}
      style={buttonArrowLeftStyle}
    >
      <ChevronLeft1
        size={size1}
        chevronLeftHeight={chevronLeftHeight}
        chevronLeftWidth={chevronLeftWidth}
      />
    </div>
  );
};

export default ButtonArrowLeft1;
