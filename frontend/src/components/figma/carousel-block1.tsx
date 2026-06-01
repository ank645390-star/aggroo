import React from "react";
import { useState } from "react";
import CardItem1 from "./card-item1";
import SliderIndicator1 from "./slider-indicator1";
import styles from "./carousel-block1.module.css";

export type CarouselBlock1Type = {
  className?: string;
};

const CarouselBlock1: React.FC<CarouselBlock1Type> = ({ className = "" }) => {
  const [cardItem1Items] = useState([
    {
      device: "Desktop" as const,
      photo: "/Photo@2x.webp",
      prop: "Ксаладан",
      prop1:
        "макро та мікро елементи для обробки зернобобових та технічних культур",
      showTag2: true,
      showTag1: true,
      cardItemHeight: undefined,
      iconStarSize: 16,
      iconStarSize1: 16,
      iconStarSize2: 16,
      iconStarSize3: 16,
      iconStarSize4: 16,
      iconStar: "/Product-Star.svg",
      iconStar1: "/Review-Star.svg",
      iconStar2: "/Card-Icon-Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Rating-Numbers.svg",
      iconStarHeight: undefined,
      iconStarHeight1: undefined,
      iconStarHeight2: undefined,
      iconStarHeight3: undefined,
      iconStarHeight4: undefined,
      iconStarWidth: undefined,
      iconStarWidth1: undefined,
      iconStarWidth2: undefined,
      iconStarWidth3: undefined,
      iconStarWidth4: undefined,
      size: 16,
      size1: 16,
      dropHeight: "16px" as const,
      dropWidth: "16px" as const,
      size2: 24,
      size3: 16,
      showFire: true,
    },
    {
      device: "Desktop" as const,
      photo: "/Photo1@2x.webp",
      prop: "Венатор",
      prop1:
        "макро та мікро елементи для обробки зернобобових та технічних культур",
      showTag2: true,
      showTag1: true,
      cardItemHeight: undefined,
      iconStarSize: 16,
      iconStarSize1: 16,
      iconStarSize2: 16,
      iconStarSize3: 16,
      iconStarSize4: 16,
      iconStar: "/Star.svg",
      iconStar1: "/Star.svg",
      iconStar2: "/Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Star.svg",
      iconStarHeight: undefined,
      iconStarHeight1: undefined,
      iconStarHeight2: undefined,
      iconStarHeight3: undefined,
      iconStarHeight4: undefined,
      iconStarWidth: undefined,
      iconStarWidth1: undefined,
      iconStarWidth2: undefined,
      iconStarWidth3: undefined,
      iconStarWidth4: undefined,
      size: 16,
      size1: 16,
      dropHeight: undefined,
      dropWidth: undefined,
      size2: 24,
      size3: 16,
      showFire: true,
    },
    {
      device: "Desktop" as const,
      photo: "/Photo2@2x.webp",
      prop: "Plantonit Fruit ",
      prop1: "макро та мікроелементи для плодових культур, концентрат",
      showTag2: false,
      showTag1: true,
      cardItemHeight: "724px" as const,
      iconStarSize: 16,
      iconStarSize1: 16,
      iconStarSize2: 16,
      iconStarSize3: 16,
      iconStarSize4: 16,
      iconStar: "/Star.svg",
      iconStar1: "/Star.svg",
      iconStar2: "/Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Star.svg",
      iconStarHeight: undefined,
      iconStarHeight1: undefined,
      iconStarHeight2: undefined,
      iconStarHeight3: undefined,
      iconStarHeight4: undefined,
      iconStarWidth: undefined,
      iconStarWidth1: undefined,
      iconStarWidth2: undefined,
      iconStarWidth3: undefined,
      iconStarWidth4: undefined,
      size: 16,
      size1: 16,
      dropHeight: undefined,
      dropWidth: undefined,
      size2: 24,
      size3: 16,
      showFire: true,
    },
  ]);
  return (
    <div className={[styles.carouselBlock, className].join(" ")}>
      <div className={styles.cardsWrapper}>
        <div className={styles.cardsGroup}>
          {cardItem1Items.map((item, index) => (
            <CardItem1
              key={index}
              device={item.device}
              photo={item.photo}
              prop={item.prop}
              prop1={item.prop1}
              showTag2={item.showTag2}
              showTag1={item.showTag1}
              cardItemHeight={item.cardItemHeight}
              iconStarSize={item.iconStarSize}
              iconStarSize1={item.iconStarSize1}
              iconStarSize2={item.iconStarSize2}
              iconStarSize3={item.iconStarSize3}
              iconStarSize4={item.iconStarSize4}
              iconStar={item.iconStar}
              iconStar1={item.iconStar1}
              iconStar2={item.iconStar2}
              iconStar3={item.iconStar3}
              iconStar4={item.iconStar4}
              iconStarHeight={item.iconStarHeight}
              iconStarHeight1={item.iconStarHeight1}
              iconStarHeight2={item.iconStarHeight2}
              iconStarHeight3={item.iconStarHeight3}
              iconStarHeight4={item.iconStarHeight4}
              iconStarWidth={item.iconStarWidth}
              iconStarWidth1={item.iconStarWidth1}
              iconStarWidth2={item.iconStarWidth2}
              iconStarWidth3={item.iconStarWidth3}
              iconStarWidth4={item.iconStarWidth4}
              size={item.size}
              size1={item.size1}
              dropHeight={item.dropHeight}
              dropWidth={item.dropWidth}
              size2={item.size2}
              size3={item.size3}
              showFire={item.showFire}
            />
          ))}
        </div>
      </div>
      <SliderIndicator1 active={1} />
    </div>
  );
};

export default CarouselBlock1;
