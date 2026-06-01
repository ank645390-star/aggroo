import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./call1.module.css";

export type Call1Type = {
  className?: string;

  /** Variant props */
  size?: any;

  /** Style props */
  callHeight?: any;
  callWidth?: any;
};

const Call1: React.FC<Call1Type> = ({
  className = "",
  size = 20,
  callHeight,
  callWidth,
}) => {
  const callStyle: CSSProperties = useMemo(() => {
    return {
      height: callHeight,
      width: callWidth,
    };
  }, [callHeight, callWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={callStyle}
    >
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={15.8}
        height={15.8}
        alt=""
        src="/Vector3.svg"
      />
    </div>
  );
};

export default Call1;
