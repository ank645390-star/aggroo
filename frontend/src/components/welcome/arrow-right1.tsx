import React from "react";
import styles from "./arrow-right1.module.css";

export type ArrowRight1Type = {
  className?: string;
  /** Variant props */
  size?: any;
};

const ArrowRight1: React.FC<ArrowRight1Type> = ({
  className = "",
  size = 16,
}) => {
  return (
    <span
      className={[styles.iconArrowRight, className].join(" ")}
      data-size={size}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
      >
        <path
          d="M5 12H19M19 12L13 6M19 12L13 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
};

export default ArrowRight1;
