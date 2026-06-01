import React from "react";
import { type CSSProperties } from "react";
import styles from "./calendar1.module.css";

export type Calendar1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Calendar1: React.FC<Calendar1Type> = ({ className = "", size = 16 }) => {
  return (
    <div
      className={[styles.iconCalendar, className].join(" ")}
      data-size={size}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={15}
        height={16.3}
        alt=""
        src="/Vector8.svg"
      />
    </div>
  );
};

export default Calendar1;
