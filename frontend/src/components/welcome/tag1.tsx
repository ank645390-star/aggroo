import React from "react";
import Fire1 from "./fire1";
import Wheat1 from "./wheat1";
import styles from "./tag1.module.css";

export type Tag1Type = {
  className?: string;
  prop?: string;
  showIcon?: boolean;
  showTag?: boolean;
  size?: any;
  showFire?: boolean;

  /** Variant props */
  device?: any;
  /** Icon variant: "fire" (default) or "wheat" */
  iconType?: "fire" | "wheat";
  /** Filled (yellow pill) vs ghost (no background) */
  filled?: boolean;
};

const Tag1: React.FC<Tag1Type> = ({
  className = "",
  device = "Desktop",
  prop,
  showIcon = true,
  showTag,
  size = 16,
  showFire,
  iconType = "fire",
  filled = false,
}) => {
  return (
    <div
      className={[
        styles.root,
        filled ? styles.filled : styles.ghost,
        className,
      ].join(" ")}
      data-device={device}
      data-variant={iconType}
    >
      {showIcon && iconType === "fire" && (
        <Fire1 size={size} showFire={showFire ?? true} />
      )}
      {showIcon && iconType === "wheat" && <Wheat1 size={size} />}
      <div className={styles.div}>{prop}</div>
    </div>
  );
};

export default Tag1;
