import React from "react";
import styles from "./jerrycan1.module.css";

export type Jerrycan1Type = {
  className?: string;
  size?: any;
};

const Jerrycan1: React.FC<Jerrycan1Type> = ({ className = "", size = 16 }) => {
  const px = typeof size === "number" ? size : parseInt(String(size), 10) || 16;
  return (
    <div
      className={[styles.iconJerrycan, className].join(" ")}
      data-size={size}
      style={{ width: px, height: px }}
      aria-hidden="true"
    >
      <svg
        className={styles.vectorIcon}
        width={px}
        height={px}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6 2.5h3.5" stroke="#1B4332" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M10.5 3.5h1.7c.45 0 .8.35.8.8V6" stroke="#1B4332" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3.2" y="4.2" width="7.6" height="9.6" rx="1.2" stroke="#1B4332" strokeWidth="1.4" />
        <path d="M3.5 10.5h7" stroke="#1B4332" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M10.8 6.5h1.4c.33 0 .6.27.6.6v2.3c0 .33-.27.6-.6.6h-1.4" stroke="#1B4332" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default Jerrycan1;
