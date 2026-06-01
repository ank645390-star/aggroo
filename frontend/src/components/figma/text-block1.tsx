import React from "react";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import styles from "./text-block1.module.css";

export type TextBlock1Type = {
  className?: string;
  prop?: string;
  prop1?: React.ReactNode;
  /** Optional rich-content overrides — used to render full Figma copy */
  intro?: ReactNode;
  h3Content?: ReactNode;

  /** Style props */
  textBlockAlignItems?: any;
  lineHeight?: any;
  lineBorderRight?: any;
  textContentGap?: any;
  headingsBackgroundColor?: any;
  h3Color?: any;
};

const DefaultIntro: React.FC = () => (
  <>
    <span>{`Протягом вегетаційного періоду рослини піддаються впливу `}</span>
    <b>великої кількості стресових факторів</b>
    <span>{`: пестицидні навантаження, несприятливі погодні умови (температура, вологість), механічні пошкодження, градобій, погіршення живлення та ін. `}</span>
  </>
);

const TextBlock1: React.FC<TextBlock1Type> = ({
  className = "",
  prop,
  prop1,
  intro,
  h3Content,
  textBlockAlignItems,
  lineHeight,
  lineBorderRight,
  textContentGap,
  headingsBackgroundColor,
  h3Color,
}) => {
  const textBlockStyle: CSSProperties = useMemo(() => {
    return {
      alignItems: textBlockAlignItems,
    };
  }, [textBlockAlignItems]);

  const lineStyle: CSSProperties = useMemo(() => {
    return {
      height: lineHeight,
      borderRight: lineBorderRight,
    };
  }, [lineHeight, lineBorderRight]);

  const textContentStyle: CSSProperties = useMemo(() => {
    return {
      gap: textContentGap,
    };
  }, [textContentGap]);

  const headingsStyle: CSSProperties = useMemo(() => {
    return {
      backgroundColor: headingsBackgroundColor,
    };
  }, [headingsBackgroundColor]);

  const h3Style: CSSProperties = useMemo(() => {
    return {
      color: h3Color,
    };
  }, [h3Color]);

  return (
    <div
      className={[styles.textBlock, className].join(" ")}
      style={textBlockStyle}
    >
      <div className={styles.line} style={lineStyle} />
      <div className={styles.textContent} style={textContentStyle}>
        <div className={styles.detailContents}>
          <div className={styles.headings} style={headingsStyle}>
            <div className={styles.div}>{prop}</div>
          </div>
          <div className={styles.div2}>
            {intro ?? <DefaultIntro />}
          </div>
        </div>
        <h3 className={styles.h3} style={h3Style}>
          {h3Content ?? prop1}
        </h3>
      </div>
    </div>
  );
};

export default TextBlock1;
