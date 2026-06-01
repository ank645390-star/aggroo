import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./drop1.module.css";

export type Drop1Type = {
  className?: string;
  size?: any;
  dropHeight?: any;
  dropWidth?: any;
};

const Drop1: React.FC<Drop1Type> = ({
  className = "",
  size = 16,
  dropHeight,
  dropWidth,
}) => {
  const dropStyle: CSSProperties = useMemo(() => {
    return {
      height: dropHeight,
      width: dropWidth,
    };
  }, [dropHeight, dropWidth]);
  const px = typeof size === "number" ? size : parseInt(String(size), 10) || 16;
  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={{ ...dropStyle, width: dropWidth || px, height: dropHeight || px, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
      aria-hidden="true"
    >
      <svg
        className={styles.vectorIcon}
        width="100%"
        height="100%"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 1.6c1.6 2.1 4.6 5.6 4.6 8.4a4.6 4.6 0 0 1-9.2 0c0-2.8 3-6.3 4.6-8.4Z"
          stroke="#1B4332"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M6 10.6c0 1.05.84 1.9 1.9 1.9"
          stroke="#1B4332"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Drop1;
