import React from "react";
import Tag1 from "./tag1";
import styles from "./frame-component7.module.css";

export type FrameComponent7Type = {
  className?: string;
};

const FrameComponent7: React.FC<FrameComponent7Type> = ({ className = "" }) => {
  return (
    <div className={[styles.plant2Photoroom1Parent, className].join(" ")}>
      <img loading="lazy" decoding="async"
        className={styles.plant2Photoroom1}
        width={1013}
        height={803}
        alt=""
        src="/plant-2-Photoroom-1@2x.webp"
      />
      <Tag1
        prop="+4.3°C "
        showIcon={false}
        showTag
        tagBorder="unset"
        tagHeight="40px"
        tagPosition="unset"
        tagTop="unset"
        tagLeft="unset"
        tagBackgroundColor="#fff"
        divFontSize="18px"
        size="16"
        showFire={false}
      />
      <div className={styles.ellipseParent}>
        <div className={styles.frameChild} />
        <Tag1
          prop="Біобезпечне "
          showIcon={false}
          showTag
          tagBorder="none"
          tagHeight="40px"
          tagPosition="absolute"
          tagTop="785px"
          tagLeft="698px"
          tagBackgroundColor="#fff"
          divFontSize="18px"
          size="16"
          showFire={false}
        />
      </div>
    </div>
  );
};

export default FrameComponent7;
