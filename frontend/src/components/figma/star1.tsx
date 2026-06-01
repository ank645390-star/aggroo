import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./star1.module.css";

export type Star1Type = {
  className?: string;
  star: string;

  /** Variant props */
  size?: any;

  /** Style props */
  starHeight?: any;
  starWidth?: any;
};

const Star1: React.FC<Star1Type> = ({
  className = "",
  size = 16,
  star,
  starHeight,
  starWidth,
}) => {
  const starStyle: CSSProperties = useMemo(() => {
    return {
      height: starHeight,
      width: starWidth,
    };
  }, [starHeight, starWidth]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      style={starStyle}
    >
      <img loading="lazy" decoding="async"
        className={styles.iconStarChild}
        width={16}
        height={16}
        alt=""
        src={star}
      />
    </div>
  );
};

export default Star1;
