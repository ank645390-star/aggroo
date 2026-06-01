import React from "react";
import { useState, type CSSProperties } from "react";
import Star1 from "./star1";
import styles from "./review-card1.module.css";

export type ReviewCard1Type = {
  className?: string;
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
};

const ReviewCard1: React.FC<ReviewCard1Type> = ({
  className = "",
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
}) => {
  const [star1Items] = useState([
    {
      size: 20,
      star: iconStar,
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: iconStar1,
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: iconStar2,
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: iconStar3,
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: iconStar4,
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
  ]);
  return (
    <section className={[styles.reviewCard, className].join(" ")}>
      <div className={styles.textContent}>
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
        <div className={styles.text}>
          <b className={styles.b}>Відмінні результати на моїй пшениці</b>
          <div className={styles.b}>
            Використовую Антистресант зі стимулюючим ефектом "ФЛОРЕС" (FLORES)
            вже два сезони, і результати вражаючі. Урожайність моєї пшениці
            зросла на 15%, а рослини виглядають набагато здоровішими.
            Застосування просте, і він добре змішується з водою. Настійно
            рекомендую серйозним фермерам.
          </div>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.div}>Дмитро К (агороном)</div>
        <div className={styles.div2}>Липень 10, 2025</div>
      </div>
    </section>
  );
};

export default ReviewCard1;
