import React from "react";
import Tag1 from "./tag1";
import FeatureBlock1 from "./feature-block1";
import styles from "./frame-component5.module.css";

export type FrameComponent5Type = {
  className?: string;
};

const FrameComponent5: React.FC<FrameComponent5Type> = ({ className = "" }) => {
  return (
    <div className={[styles.logicTagParent, className].join(" ")}>
      <section className={styles.logicTag}>
        <div className={styles.div}>
          <span className={styles.span}>Логістика</span>
          <span className={styles.span2}>
            <span className={styles.span3}>{` `}</span>
            <span>живих рішень</span>
          </span>
        </div>
        <div className={styles.tagWrapper}>
          <Tag1
            prop="Активне "
            showIcon={false}
            showTag
            tagBorder="none"
            tagHeight="40px"
            tagPosition="unset"
            tagTop="unset"
            tagLeft="unset"
            tagBackgroundColor="#fff"
            divFontSize="18px"
            size="16"
            showFire={false}
          />
        </div>
      </section>
      <section className={styles.featureBlockParent}>
        <FeatureBlock1
          size={60}
          style="Bare"
          labelTop="Цифрові датчики"
          labelBottom="Цілодобовий моніторинг температури"
          showRightIcon={false}
          showLabelTop
          showLeftIcon
          featureBlockWidth="472px"
          featureBlockAlignSelf="unset"
          textStackAlignItems="flex-start"
          size1="60"
          size2="60"
          temperatureHeight="60px"
          temperatureWidth="60px"
        />
        <FeatureBlock1
          size={60}
          style="Bare"
          labelTop="Холодильні камери"
          labelBottom="Власне обладнання на виробництві"
          showRightIcon
          showLabelTop
          showLeftIcon={false}
          featureBlockWidth="472px"
          featureBlockAlignSelf="unset"
          textStackAlignItems="flex-end"
          size1="60"
          size2="60"
        />
      </section>
    </div>
  );
};

export default FrameComponent5;
