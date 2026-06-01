import React from "react";
import styles from "./plus1.module.css";

export type Plus1Type = {
  className?: string;
  size?: any;
};

const Plus1: React.FC<Plus1Type> = ({ className = "", size = 20 }) => {
  return (
    <div className={[styles.iconPlus, className].join(" ")} data-size={size}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={styles.vectorIcon}
      >
        <path
          d="M10 4v12M4 10h12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Plus1;
