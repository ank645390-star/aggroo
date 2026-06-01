import React from "react";
import { type CSSProperties } from "react";
import styles from "./user1.module.css";

export type User1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const User1: React.FC<User1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconUser, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={12.5}
        height={14.2}
        alt=""
        src="/Vector1.svg"
      />
    </div>
  );
};

export default User1;
