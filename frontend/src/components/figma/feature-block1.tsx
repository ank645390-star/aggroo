import React from "react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import Lightning1 from "./lightning1";
import Temperature1 from "./temperature1";
import styles from "./feature-block1.module.css";

export type FeatureBlock1Type = {
  className?: string;
  labelTop?: string;
  labelBottom?: string;
  showRightIcon?: boolean;
  showLabelTop?: boolean;
  showLeftIcon?: boolean;
  size1?: any;
  size2?: any;
  temperatureHeight?: any;
  temperatureWidth?: any;

  /** Optional custom left-icon override */
  leftIcon?: ReactNode;

  /** Variant props */
  size?: any;
  /**
   * Style variants:
   * - "Contained"  → frosted-glass tile (default — used over the tree image)
   * - "Bare"       → unstyled (used in chaine section)
   */
  style?: any;

  /** Style props */
  featureBlockWidth?: any;
  featureBlockAlignSelf?: any;
  textStackAlignItems?: any;
};

const FeatureBlock1: React.FC<FeatureBlock1Type> = ({
  className = "",
  size = 60,
  style = "Contained",
  labelTop,
  labelBottom,
  showRightIcon = false,
  showLabelTop = true,
  showLeftIcon = true,
  featureBlockWidth,
  featureBlockAlignSelf,
  textStackAlignItems,
  size1 = 36,
  size2 = 20,
  temperatureHeight,
  temperatureWidth,
  leftIcon,
}) => {
  const featureBlockStyle: CSSProperties = useMemo(() => {
    return {
      width: featureBlockWidth,
      alignSelf: featureBlockAlignSelf,
    };
  }, [featureBlockWidth, featureBlockAlignSelf]);

  const textStackStyle: CSSProperties = useMemo(() => {
    return {
      alignItems: textStackAlignItems,
    };
  }, [textStackAlignItems]);

  return (
    <div
      className={[styles.root, className].join(" ")}
      data-size={size}
      data-style={style}
      style={featureBlockStyle}
    >
      {!!showLeftIcon && (leftIcon ?? <Lightning1 size={size1} />)}
      <div className={styles.textStack} style={textStackStyle}>
        {!!showLabelTop && <div className={styles.labelTop}>{labelTop}</div>}
        <div className={styles.labelBottom}>{labelBottom}</div>
      </div>
      {!!showRightIcon && (
        <Temperature1
          size={size2}
          temperatureHeight={temperatureHeight}
          temperatureWidth={temperatureWidth}
        />
      )}
    </div>
  );
};

export default FeatureBlock1;
