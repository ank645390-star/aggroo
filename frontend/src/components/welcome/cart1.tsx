import React from "react";
import { type CSSProperties } from "react";
import styles from "./cart1.module.css";

export type Cart1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Cart1: React.FC<Cart1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconCart, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={14}
        height={13.3}
        alt=""
        src="/Vector2.svg"
      />
    </div>
  );
};

export default Cart1;
