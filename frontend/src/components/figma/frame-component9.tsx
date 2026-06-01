import React from "react";
import { useState } from "react";
import Star1 from "./star1";
import SecondaryButton1 from "./secondary-button1";
import ReviewCard1 from "./review-card1";
import LeaveReviewModal from "../reviews/LeaveReviewModal";
import styles from "./frame-component9.module.css";

export type FrameComponent9Type = {
  className?: string;
  productSlug?: string;
  productName?: string;
};

const FrameComponent9: React.FC<FrameComponent9Type> = ({
  className = "",
  productSlug,
  productName,
}) => {
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [star1Items] = useState([
    {
      size: 20,
      star: "/Stars.svg",
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: "/Star.svg",
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: "/Star.svg",
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: "/Star.svg",
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
    {
      size: 20,
      star: "/Star.svg",
      starHeight: "20px" as const,
      starWidth: "20px" as const,
    },
  ]);
  const [reviewCard1Items] = useState([
    {
      iconStarSize: 20,
      iconStarSize1: 20,
      iconStarSize2: 20,
      iconStarSize3: 20,
      iconStarSize4: 20,
      iconStar: "/Star.svg",
      iconStar1: "/Star.svg",
      iconStar2: "/Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Reviewer-Rating.svg",
      iconStarHeight: "20px" as const,
      iconStarHeight1: "20px" as const,
      iconStarHeight2: "20px" as const,
      iconStarHeight3: "20px" as const,
      iconStarHeight4: "20px" as const,
      iconStarWidth: "20px" as const,
      iconStarWidth1: "20px" as const,
      iconStarWidth2: "20px" as const,
      iconStarWidth3: "20px" as const,
      iconStarWidth4: "20px" as const,
    },
    {
      iconStarSize: 20,
      iconStarSize1: 20,
      iconStarSize2: 20,
      iconStarSize3: 20,
      iconStarSize4: 20,
      iconStar: "/Star.svg",
      iconStar1: "/Star.svg",
      iconStar2: "/Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Star.svg",
      iconStarHeight: "20px" as const,
      iconStarHeight1: "20px" as const,
      iconStarHeight2: "20px" as const,
      iconStarHeight3: "20px" as const,
      iconStarHeight4: "20px" as const,
      iconStarWidth: "20px" as const,
      iconStarWidth1: "20px" as const,
      iconStarWidth2: "20px" as const,
      iconStarWidth3: "20px" as const,
      iconStarWidth4: "20px" as const,
    },
    {
      iconStarSize: 20,
      iconStarSize1: 20,
      iconStarSize2: 20,
      iconStarSize3: 20,
      iconStarSize4: 20,
      iconStar: "/Star.svg",
      iconStar1: "/Star.svg",
      iconStar2: "/Star.svg",
      iconStar3: "/Star.svg",
      iconStar4: "/Star.svg",
      iconStarHeight: "20px" as const,
      iconStarHeight1: "20px" as const,
      iconStarHeight2: "20px" as const,
      iconStarHeight3: "20px" as const,
      iconStarHeight4: "20px" as const,
      iconStarWidth: "20px" as const,
      iconStarWidth1: "20px" as const,
      iconStarWidth2: "20px" as const,
      iconStarWidth3: "20px" as const,
      iconStarWidth4: "20px" as const,
    },
  ]);
  return (
    <section className={[styles.customersContentWrapper, className].join(" ")}>
      <div className={styles.customersContent}>
        <h2 className={styles.h2}>
          <span>
            <span className={styles.span}>Досвід</span>
          </span>
          <span className={styles.span2}>
            <span>{` `}</span>
            <span>покупців</span>
          </span>
        </h2>
        <div className={styles.rateContentParent}>
          <section className={styles.rateContent}>
            <div className={styles.mainContent}>
              <div className={styles.topRow}>
                <h2 className={styles.averageValue}>4.6</h2>
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
                <div className={styles.div}>Загальних 127 відгуків</div>
              </div>
              <div className={styles.rateGroup}>
                <div className={styles.container}>
                  <div className={styles.container2}>
                    <div className={styles.rateValue}>5</div>
                    <img loading="lazy" decoding="async"
                      className={styles.totalRatesIcon}
                      width={14}
                      height={14}
                      alt=""
                      src="/Total-Rates.svg"
                    />
                  </div>
                  <div className={styles.container3}>
                    <div className={styles.container4} />
                  </div>
                  <div className={styles.container5}>
                    <div className={styles.div2}>89</div>
                  </div>
                </div>
                <div className={styles.container}>
                  <div className={styles.container2}>
                    <div className={styles.rateValue}>4</div>
                    <img loading="lazy" decoding="async"
                      className={styles.totalRatesIcon}
                      width={14}
                      height={14}
                      alt=""
                      src="/Star-1.svg"
                    />
                  </div>
                  <div className={styles.container3}>
                    <div className={styles.container9} />
                  </div>
                  <div className={styles.container10}>
                    <div className={styles.div4}>28</div>
                  </div>
                </div>
                <div className={styles.container}>
                  <div className={styles.container2}>
                    <div className={styles.rateValue}>3</div>
                    <img loading="lazy" decoding="async"
                      className={styles.totalRatesIcon}
                      width={14}
                      height={14}
                      alt=""
                      src="/Star-1.svg"
                    />
                  </div>
                  <div className={styles.container13}>
                    <div className={styles.container14} />
                  </div>
                  <div className={styles.container15}>
                    <div className={styles.div6}>7</div>
                  </div>
                </div>
                <div className={styles.container}>
                  <div className={styles.container2}>
                    <div className={styles.rateValue}>2</div>
                    <img loading="lazy" decoding="async"
                      className={styles.totalRatesIcon}
                      width={14}
                      height={14}
                      alt=""
                      src="/Star-1.svg"
                    />
                  </div>
                  <div className={styles.container13} />
                  <div className={styles.container19}>
                    <div className={styles.div8}>0</div>
                  </div>
                </div>
                <div className={styles.container}>
                  <div className={styles.container2}>
                    <div className={styles.rateValue}>1</div>
                    <img loading="lazy" decoding="async"
                      className={styles.totalRatesIcon}
                      width={14}
                      height={14}
                      alt=""
                      src="/Star-1.svg"
                    />
                  </div>
                  <div className={styles.container13} />
                  <div className={styles.container19}>
                    <div className={styles.div8}>0</div>
                  </div>
                </div>
              </div>
            </div>
            <SecondaryButton1
              state="Default"
              type="Outline"
              prop="Залишити відгук"
              showIcon
              icon="arrow"
              secondaryButtonHeight="unset"
              secondaryButtonWidth="unset"
              secondaryButtonAlignSelf="stretch"
              size="24"
              onClick={() => setReviewModalOpen(true)}
            />
          </section>
          <div className={styles.reviewGroup}>
            {reviewCard1Items.map((item, index) => (
              <ReviewCard1
                key={index}
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
              />
            ))}
          </div>
        </div>
      </div>
      <LeaveReviewModal
        open={reviewModalOpen}
        productSlug={productSlug}
        productName={productName}
        onClose={() => setReviewModalOpen(false)}
      />
    </section>
  );
};

export default FrameComponent9;
