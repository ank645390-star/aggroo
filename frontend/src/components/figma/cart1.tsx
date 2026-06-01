import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./cart1.module.css";

export type Cart1Type = {
  className?: string;

  /** Variant props */
  size?: any;

  /** Style props */
  cartPosition?: any;
  cartTop?: any;
  cartLeft?: any;
  cartWidth?: any;
  cartHeight?: any;
};

const Cart1: React.FC<Cart1Type> = ({
  className = "",
  size = 16,
  cartPosition,
  cartTop,
  cartLeft,
  cartWidth,
  cartHeight,
}) => {
  const cartStyle: CSSProperties = useMemo(() => {
    return {
      position: cartPosition,
      top: cartTop,
      left: cartLeft,
      width: cartWidth,
      height: cartHeight,
    };
  }, [cartPosition, cartTop, cartLeft, cartWidth, cartHeight]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={cartStyle}
    >
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
