import React from "react";
import { useState, useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
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
  size?: any;
  size1?: any;
  size2?: any;
  size3?: any;
  showFire?: boolean;

  /** Variant props */
  device?: any;

  /** Style props */
  cardItemHeight?: any;
  contentFlex?: any;
  contentHeight?: any;

  /** Cart integration */
  onAddToCart?: () => void;

  /** Product slug — when set, the whole card links to /product/{slug} */
  slug?: string;

  /** Optional: override price/specs display */
  priceLabel?: string;     // "від 420 ₴/л"
  taraLabel?: string;      // "Тара: 1, 5, 10 л"
  normaLabel?: string;     // "Норма: 1.5-2 л/га"
  ratingValue?: number;    // 4.9
  ratingCount?: number;    // 100
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
  contentFlex,
  contentHeight,
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
  size = 16,
  size1 = 16,
  size2 = 24,
  size3 = 16,
  showFire,
  onAddToCart,
  slug,
  priceLabel,
  taraLabel,
  normaLabel,
  ratingValue,
  ratingCount,
}) => {
  const cardItemStyle: CSSProperties = useMemo(() => {
    return {
      height: cardItemHeight,
    };
  }, [cardItemHeight]);

  const contentStyle: CSSProperties = useMemo(() => {
    return {
      flex: contentFlex,
      height: contentHeight,
    };
  }, [contentFlex, contentHeight]);

  const [star1Items] = useState([
    {
      size: 16,
      star: iconStar,
    },
    {
      size: 16,
      star: iconStar1,
    },
    {
      size: 16,
      star: iconStar2,
    },
    {
      size: 16,
      star: iconStar3,
    },
    {
      size: 16,
      star: iconStar4,
    },
  ]);
  return (
    <Link
      to={slug ? `/product/${slug}` : "/product"}
      className={styles.cardLink}
      style={{ textDecoration: "none", color: "inherit" }}
      aria-label={prop}
    >
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
              prop="Хіт продажу"
              iconType="fire"
              filled={false}
              showIcon
              showTag
              size="16"
              showFire
            />
          )}
          {!!showTag2 && (
            <Tag1
              device="Desktop"
              prop="Захист рослин"
              iconType="wheat"
              filled
              showIcon
              showTag
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
      <div className={styles.content} style={contentStyle}>
        <div className={styles.infoBlock}>
          <div className={styles.titleBlock}>
            <div className={styles.rating}>
              <div className={styles.star}>
                {star1Items.map((item, index) => (
                  <Star1 key={index} size={item.size} star={item.star} />
                ))}
              </div>
              <div className={styles.ratingCount}>{(ratingValue ?? 4.9).toFixed(1)} ({ratingCount ?? 100})</div>
            </div>
            <div className={styles.titleGroup}>
              <h3 className={styles.h3}>{prop}</h3>
              <div className={styles.div}>{prop1}</div>
            </div>
          </div>
          <div className={styles.specs}>
            <div className={styles.specRow}>
              <Jerrycan1 size={size} />
              <div className={styles.div2}>{taraLabel || `Тара: 1, 5, 10 л `}</div>
            </div>
            <div className={styles.specRow2}>
              <Drop1 size={size1} />
              <div className={styles.div3}>{normaLabel || `Норма: 1.5-2 л/га `}</div>
            </div>
          </div>
        </div>
        <div className={styles.priceRow} onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
          <h2 className={styles.h2}>{priceLabel || "від 420 ₴/л"}</h2>
          <PrimaryButton2
            state="Default"
            type="Text"
            showLabel
            size2="24"
            onClick={() => onAddToCart?.()}
            ariaLabel={`Додати ${prop ?? "товар"} в кошик`}
          />
        </div>
      </div>
    </section>
    </Link>
  );
};

export default CardItem1;
