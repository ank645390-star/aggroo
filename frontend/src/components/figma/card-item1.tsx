import React from "react";
import { useState, useMemo, type CSSProperties } from "react";
import Tag1 from "./tag1";
import Star1 from "./star1";
import Jerrycan1 from "./jerrycan1";
import Drop1 from "./drop1";
import PrimaryButton2 from "./primary-button2";
import styles from "./card-item1.module.css";

export type CardItem1Type = {
  className?: string;
  photo: string;
  prop?: string;
  prop1?: string;
  showTag2?: boolean;
  showTag1?: boolean;
  iconStarSize?: any;
  iconStarSize1?: any;
  iconStarSize2?: any;
  iconStarSize3?: any;
  iconStarSize4?: any;
  iconStar: string;
  iconStar1: string;
  iconStar2: string;
  iconStar3: string;
  iconStar4: string;
  iconStarHeight?: any;
  iconStarHeight1?: any;
  iconStarHeight2?: any;
  iconStarHeight3?: any;
  iconStarHeight4?: any;
  iconStarWidth?: any;
  iconStarWidth1?: any;
  iconStarWidth2?: any;
  iconStarWidth3?: any;
  iconStarWidth4?: any;
  size?: any;
  size1?: any;
  dropHeight?: any;
  dropWidth?: any;
  size2?: any;
  size3?: any;
  showFire?: boolean;

  /** Variant props */
  device?: any;

  /** Style props */
  cardItemHeight?: any;
};

const CardItem1: React.FC<CardItem1Type> = ({
  className = "",
  device = "Desktop",
  photo,
  prop,
  prop1,
  showTag2 = true,
  showTag1 = true,
  cardItemHeight,
  iconStarSize = 16,
  iconStarSize1 = 16,
  iconStarSize2 = 16,
  iconStarSize3 = 16,
  iconStarSize4 = 16,
  iconStar,
  iconStar1,
  iconStar2,
  iconStar3,
  iconStar4,
  iconStarHeight,
  iconStarHeight1,
  iconStarHeight2,
  iconStarHeight3,
  iconStarHeight4,
  iconStarWidth,
  iconStarWidth1,
  iconStarWidth2,
  iconStarWidth3,
  iconStarWidth4,
  size = 16,
  size1 = 16,
  dropHeight,
  dropWidth,
  size2 = 24,
  size3 = 16,
  showFire,
}) => {
  const cardItemStyle: CSSProperties = useMemo(() => {
    return {
      height: cardItemHeight,
    };
  }, [cardItemHeight]);

  const [star1Items] = useState([
    {
      size: 16,
      star: iconStar,
      starHeight: undefined,
      starWidth: undefined,
    },
    {
      size: 16,
      star: iconStar1,
      starHeight: undefined,
      starWidth: undefined,
    },
    {
      size: 16,
      star: iconStar2,
      starHeight: undefined,
      starWidth: undefined,
    },
    {
      size: 16,
      star: iconStar3,
      starHeight: undefined,
      starWidth: undefined,
    },
    {
      size: 16,
      star: iconStar4,
      starHeight: undefined,
      starWidth: undefined,
    },
  ]);
  return (
    <section
      className={[styles.cardItem, className].join(" ")}
      data-device={device}
      style={cardItemStyle}
    >
      <div className={styles.imageContainer}>
        <div className={styles.imageContainerChild} />
        <div className={styles.tags}>
          {!!showTag1 && (
            <Tag1
              device="Desktop"
              prop="Хіт продажу "
              showIcon
              showTag
              size="16"
              showFire
            />
          )}
          {!!showTag2 && (
            <Tag1
              device="Desktop"
              prop="Захист рослин "
              showIcon
              showTag
              tagBorder="unset"
              tagHeight="unset"
              tagPosition="unset"
              tagTop="unset"
              tagLeft="unset"
              tagBackgroundColor="#f7fae8"
              divFontSize="12px"
              size="16"
            />
          )}
        </div>
        <div className={styles.photoContainer}>
          <img decoding="async"
            className={styles.photoIcon}
            loading="lazy"
            width={316}
            height={307}
            alt=""
            src={photo}
          />
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.infoBlock}>
          <div className={styles.titleBlock}>
            <div className={styles.rating}>
              <div className={styles.star}>
                {star1Items.map((item, index) => (
                  <Star1
                    key={index}
                    size={item.size}
                    star={item.star}
                    starHeight={item.starHeight}
                    starWidth={item.starWidth}
                  />
                ))}
              </div>
              <div className={styles.rateAvg}>4.9 (100)</div>
            </div>
            <div className={styles.titleGroup}>
              <h3 className={styles.h3}>{prop}</h3>
              <div className={styles.div}>{prop1}</div>
            </div>
          </div>
          <div className={styles.specs}>
            <div className={styles.specRow}>
              <Jerrycan1 size={size} />
              <div className={styles.div2}>{`Тара: 1, 5, 10 л `}</div>
            </div>
            <div className={styles.specRow2}>
              <Drop1
                size={size1}
                dropHeight={dropHeight}
                dropWidth={dropWidth}
              />
              <div className={styles.div3}>{`Норма: 1.5-2 л/га `}</div>
            </div>
          </div>
        </div>
        <div className={styles.priceRow}>
          <h2 className={styles.h2}>від 420 ₴/л</h2>
          <PrimaryButton2 state="Default" type="Text" showLabel size2="24" />
        </div>
      </div>
    </section>
  );
};

export default CardItem1;
