import React from "react";
import { type CSSProperties } from "react";
import Temperature1 from "./temperature1";
import styles from "./left-icon.module.css";

export type LeftIconType = {
  className?: string;
  showRightIcon?: boolean;
  showLabelTop?: boolean;
  showLeftIcon?: boolean;
  size1?: any;
  temperatureHeight?: any;
  temperatureWidth?: any;

  /** Variant props */
  size?: any;
  style?: any;
};

const LeftIcon: React.FC<LeftIconType> = ({
  className = "",
  size = 60,
  style = "Contained",
  showRightIcon = false,
  showLabelTop = true,
  showLeftIcon = true,
  size1 = 20,
  temperatureHeight,
  temperatureWidth,
}) => {
  return (
    <div
      className={[styles.featureBlock, className].join(" ")}
      data-size={size}
      data-style={style}
    >
      {!!showLeftIcon && (
        <img decoding="async"
          className={styles.leftIcon}
          loading="lazy"
          width={36}
          height={36}
          alt=""
          src="/Vector6.svg"
        />
      )}
      <div className={styles.textStack}>
        {!!showLabelTop && (
          <div className={styles.labelTop}>Покращення поглинання</div>
        )}
        <div className={styles.labelBottom}>
          Впливає на рівномірне покриття листя та засвоєння активних речовин
        </div>
      </div>
      {!!showRightIcon && (
        <Temperature1
          size={size1}
          temperatureHeight={temperatureHeight}
          temperatureWidth={temperatureWidth}
        />
      )}
    </div>
  );
};

export default LeftIcon;
