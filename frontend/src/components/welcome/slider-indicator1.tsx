import React from "react";
import { type CSSProperties } from "react";
import styles from "./slider-indicator1.module.css";

export type SliderIndicator1Type = {
  className?: string;

  /** Variant props */
  active?: any;
};

const SliderIndicator1: React.FC<SliderIndicator1Type> = ({
  className = "",
  active = 1,
}) => {
  return (
    <div
      className={[styles.sliderIndicator, className].join(" ")}
      data-active={active}
    >
      <div className={styles.sliderDot} />
      <div className={styles.sliderDot2} />
      <div className={styles.sliderDot3} />
    </div>
  );
};

export default SliderIndicator1;
