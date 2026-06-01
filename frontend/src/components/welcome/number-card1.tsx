import React from "react";
import { useMemo, type CSSProperties } from "react";
import styles from "./number-card1.module.css";

export type NumberCard1Type = {
  className?: string;
  prop?: string;
  prop1?: string;

  /** Style props */
  numberCardWidth?: any;
  lineDivBorderRight?: any;
  h2Color?: any;
};

const NumberCard1: React.FC<NumberCard1Type> = ({
  className = "",
  prop,
  prop1,
  numberCardWidth,
  lineDivBorderRight,
  h2Color,
}) => {
  const numberCardStyle: CSSProperties = useMemo(() => {
    return {
      width: numberCardWidth,
    };
  }, [numberCardWidth]);

  const lineDivStyle: CSSProperties = useMemo(() => {
    return {
      borderRight: lineDivBorderRight,
    };
  }, [lineDivBorderRight]);

  const h2Style: CSSProperties = useMemo(() => {
    return {
      color: h2Color,
    };
  }, [h2Color]);

  return (
    <div
      className={[styles.numberCard, className].join(" ")}
      style={numberCardStyle}
    >
      <div className={styles.numberCardChild} style={lineDivStyle} />
      <div className={styles.content}>
        <h2 className={styles.h2} style={h2Style}>
          {prop}
        </h2>
        <h3 className={styles.h3}>{prop1}</h3>
      </div>
    </div>
  );
};

export default NumberCard1;
