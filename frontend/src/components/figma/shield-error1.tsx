import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./shield-error1.module.css";

export type ShieldError1Type = {
  className?: string;

  /** Variant props */
  size?: any;

  /** Style props */
  shieldErrorHeight?: any;
  shieldErrorWidth?: any;
};

const ShieldError1: React.FC<ShieldError1Type> = ({
  className = "",
  size = 16,
  shieldErrorHeight,
  shieldErrorWidth,
}) => {
  const shieldErrorStyle: CSSProperties = useMemo(() => {
    return {
      height: shieldErrorHeight,
      width: shieldErrorWidth,
    };
  }, [shieldErrorHeight, shieldErrorWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={shieldErrorStyle}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={15}
        height={17.5}
        alt=""
        src="/Vector12.svg"
      />
    </div>
  );
};

export default ShieldError1;
