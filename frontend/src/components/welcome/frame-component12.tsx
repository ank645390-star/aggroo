import React from "react";
import { type CSSProperties } from "react";
import MD1 from "./m-d1";
import styles from "./frame-component12.module.css";

export type FrameComponent12Type = {
  className?: string;
  prop: string;
  prop1: string;
  title?: string;
  description?: string;
  prop2: string;
  prop3: string;
  prop4: string;
  prop5: string;
  showIcon?: boolean;
  iconVisible?: boolean;
  prop6?: string;
  showLabel?: boolean;
  primaryButtonJustifyContent?: any;
  iconContainerBackgroundColor?: any;
};

const FrameComponent12: React.FC<FrameComponent12Type> = ({
  className = "",
  prop,
  prop1,
  title,
  description,
  prop2,
  prop3,
  prop4,
  prop5,
  showIcon,
  iconVisible,
  prop6,
  showLabel,
  primaryButtonJustifyContent,
  iconContainerBackgroundColor,
}) => {
  return (
    <section className={[styles.categoryRowsThreeWrapper, className].join(" ")}>
      <div className={styles.categoryRowsThree}>
        <div className={styles.frameParent}>
          <div className={styles.ellipseParent}>
            <div className={styles.frameChild} />
            {!!showIcon && (
              <img loading="lazy" decoding="async"
                className={styles.icon}
                width={99}
                height={93}
                alt=""
                src={prop}
              />
            )}
            {!!iconVisible && (
              <img loading="lazy" decoding="async"
                className={styles.icon2}
                width={102}
                height={119}
                alt=""
                src={prop1}
              />
            )}
          </div>
          <div className={styles.titleParent}>
            <h1 className={styles.title}>{title}</h1>
            <h3 className={styles.description}>{description}</h3>
          </div>
          <img loading="lazy" decoding="async"
            className={styles.icon3}
            width={138}
            height={106}
            alt=""
            src={prop2}
          />
          <img loading="lazy" decoding="async"
            className={styles.icon4}
            width={125}
            height={126}
            alt=""
            src={prop3}
          />
          <img loading="lazy" decoding="async"
            className={styles.icon5}
            width={105}
            height={125}
            alt=""
            src={prop4}
          />
          <img loading="lazy" decoding="async"
            className={styles.icon6}
            width={112}
            height={87}
            alt=""
            src={prop5}
          />
        </div>
        <MD1
          prop={prop6}
          showLabel={showLabel}
          primaryButtonJustifyContent={primaryButtonJustifyContent}
          iconContainerBackgroundColor={iconContainerBackgroundColor}
        />
      </div>
    </section>
  );
};

export default FrameComponent12;
