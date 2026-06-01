import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./m-d1.module.css";

export type MD1Type = {
  className?: string;
  prop?: string;
  showLabel?: boolean;

  /** Variant props */
  device?: any;

  /** Style props */
  primaryButtonJustifyContent?: any;
  iconContainerBackgroundColor?: any;
};

const MD1: React.FC<MD1Type> = ({
  className = "",
  device = "Default",
  prop,
  showLabel = true,
  primaryButtonJustifyContent,
  iconContainerBackgroundColor,
}) => {
  const primaryButton1Style: CSSProperties = useMemo(() => {
    return {
      justifyContent: primaryButtonJustifyContent,
    };
  }, [primaryButtonJustifyContent]);

  const iconContainerStyle: CSSProperties = useMemo(() => {
    return {
      backgroundColor: iconContainerBackgroundColor,
    };
  }, [iconContainerBackgroundColor]);

  return (
    <div
      className={[styles.primaryButton, className].join(" ")}
      data-device={device}
      style={primaryButton1Style}
    >
      {!!showLabel && <div className={styles.div}>{prop}</div>}
      <div className={styles.iconContainer} style={iconContainerStyle}>
        <img loading="lazy" decoding="async"
          className={styles.iconArrowRight}
          width={20}
          height={20}
          alt=""
          src="/Icon-Arrow-Right.svg"
        />
      </div>
    </div>
  );
};

export default MD1;
