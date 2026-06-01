import React from "react";
import { useMemo, type CSSProperties } from "react";
import ButtonArrowLeft1 from "./button-arrow-left1";
import ButtonArrowRight1 from "./button-arrow-right1";
import styles from "./arrow-switcher1.module.css";

export type ArrowSwitcher1Type = {
  className?: string;
  size1?: any;
  state?: any;
  buttonArrowLeftHeight?: any;
  buttonArrowLeftWidth?: any;
  size2?: any;
  state1?: any;
  buttonArrowRightHeight?: any;
  buttonArrowRightWidth?: any;

  /** Variant props */
  active?: any;
  size?: any;

  /** Style props */
  arrowSwitcherWidth?: any;
  arrowSwitcherHeight?: any;
  arrowSwitcherPosition?: any;
  arrowSwitcherTop?: any;
  arrowSwitcherLeft?: any;
};

const ArrowSwitcher1: React.FC<ArrowSwitcher1Type> = ({
  className = "",
  active = "Left",
  size = "Large",
  arrowSwitcherWidth,
  arrowSwitcherHeight,
  arrowSwitcherPosition,
  arrowSwitcherTop,
  arrowSwitcherLeft,
  size1 = "Large",
  state = "Default",
  buttonArrowLeftHeight,
  buttonArrowLeftWidth,
  size2 = "Large",
  state1,
  buttonArrowRightHeight,
  buttonArrowRightWidth,
}) => {
  const arrowSwitcherStyle: CSSProperties = useMemo(() => {
    return {
      width: arrowSwitcherWidth,
      height: arrowSwitcherHeight,
      position: arrowSwitcherPosition,
      top: arrowSwitcherTop,
      left: arrowSwitcherLeft,
    };
  }, [
    arrowSwitcherWidth,
    arrowSwitcherHeight,
    arrowSwitcherPosition,
    arrowSwitcherTop,
    arrowSwitcherLeft,
  ]);

  return (
    <section
      className={[styles.root, className].join(" ")}
      data-active={active}
      data-size={size}
      style={arrowSwitcherStyle}
    >
      <ButtonArrowLeft1
        size={size1}
        state={state}
        buttonArrowLeftHeight={buttonArrowLeftHeight}
        buttonArrowLeftWidth={buttonArrowLeftWidth}
        size1="20"
        chevronLeftHeight="20px"
        chevronLeftWidth="20px"
      />
      <ButtonArrowRight1
        size={size2}
        state={state1}
        buttonArrowRightHeight={buttonArrowRightHeight}
        buttonArrowRightWidth={buttonArrowRightWidth}
        size1="36"
        chevronRightHeight="36px"
        chevronRightWidth="36px"
      />
    </section>
  );
};

export default ArrowSwitcher1;
