import React from "react";
import { useMemo, type CSSProperties } from "react";
import Fire1 from "./fire1";
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

  /** Style props */
  tagBorder?: any;
  tagHeight?: any;
  tagPosition?: any;
  tagTop?: any;
  tagLeft?: any;
  tagBackgroundColor?: any;
  divFontSize?: any;
};

const Tag1: React.FC<Tag1Type> = ({
  className = "",
  device = "Desktop",
  prop,
  showIcon = true,
  showTag,
  tagBorder,
  tagHeight,
  tagPosition,
  tagTop,
  tagLeft,
  tagBackgroundColor,
  divFontSize,
  size = 16,
  showFire,
}) => {
  const tagStyle: CSSProperties = useMemo(() => {
    return {
      border: tagBorder,
      height: tagHeight,
      position: tagPosition,
      top: tagTop,
      left: tagLeft,
      backgroundColor: tagBackgroundColor,
    };
  }, [tagBorder, tagHeight, tagPosition, tagTop, tagLeft, tagBackgroundColor]);

  const divStyle: CSSProperties = useMemo(() => {
    return {
      fontSize: divFontSize,
    };
  }, [divFontSize]);

  return (
    <div
      className={[styles.tag, className].join(" ")}
      data-device={device}
      style={tagStyle}
    >
      <Fire1 size={size} showFire={showFire} />
      <div className={styles.div} style={divStyle}>
        {prop}
      </div>
    </div>
  );
};

export default Tag1;
