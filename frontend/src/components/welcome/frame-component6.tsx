import React from "react";
import { useMemo, type CSSProperties } from "react";
import MD1 from "./m-d1";
import styles from "./frame-component6.module.css";

export type FrameComponent6Type = {
  className?: string;
  inserts: string;
  title?: string;
  description?: string;
  prop: string;
  prop1: string;
  prop2: string;
  prop3: string;
  showIcon?: boolean;
  iconVisible?: boolean;
  iconVisible1?: boolean;
  iconVisible2?: boolean;
  prop4?: string;
  showLabel?: boolean;
  primaryButtonJustifyContent?: any;
  iconContainerBackgroundColor?: any;

  /** Style props */
  frameDivGap?: any;
  titleHeight?: any;
};

const FrameComponent6: React.FC<FrameComponent6Type> = ({
  className = "",
  inserts,
  title,
  description,
  prop,
  prop1,
  prop2,
  prop3,
  showIcon,
  iconVisible,
  iconVisible1,
  iconVisible2,
  frameDivGap,
  titleHeight,
  prop4,
  showLabel,
  primaryButtonJustifyContent,
  iconContainerBackgroundColor,
}) => {
  const frameDivStyle: CSSProperties = useMemo(() => {
    return {
      gap: frameDivGap,
    };
  }, [frameDivGap]);

  const titleStyle: CSSProperties = useMemo(() => {
    return {
      height: titleHeight,
    };
  }, [titleHeight]);

  return (
    <section className={[styles.categoryColumnOneInner, className].join(" ")}>
      <div className={styles.frameParent}>
        <div className={styles.insertsParent}>
          <img decoding="async"
            className={styles.insertsIcon}
            loading="lazy"
            width={131}
            height={131}
            alt=""
            src={inserts}
          />
          <div className={styles.titleParent} style={frameDivStyle}>
            <h1 className={styles.title} style={titleStyle}>
              {title}
            </h1>
            <h3 className={styles.description}>{description}</h3>
          </div>
          {!!showIcon && (
            <img loading="lazy" decoding="async"
              className={styles.icon}
              width={138}
              height={106}
              alt=""
              src={prop}
            />
          )}
          {!!iconVisible && (
            <img loading="lazy" decoding="async"
              className={styles.icon2}
              width={125}
              height={126}
              alt=""
              src={prop1}
            />
          )}
          {!!iconVisible1 && (
            <img loading="lazy" decoding="async"
              className={styles.icon3}
              width={105}
              height={125}
              alt=""
              src={prop2}
            />
          )}
          {!!iconVisible2 && (
            <img loading="lazy" decoding="async"
              className={styles.icon4}
              width={112}
              height={87}
              alt=""
              src={prop3}
            />
          )}
        </div>
        <MD1
          prop={prop4}
          showLabel={showLabel}
          primaryButtonJustifyContent={primaryButtonJustifyContent}
          iconContainerBackgroundColor={iconContainerBackgroundColor}
        />
      </div>
    </section>
  );
};

export default FrameComponent6;
