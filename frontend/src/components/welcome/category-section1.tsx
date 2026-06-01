import React from "react";
import { useNavigate } from "react-router-dom";
import CategoryCard from "./category-card";
import RevealHeading from "./reveal-heading";
import styles from "./category-section1.module.css";

export type CategorySection1Type = {
  className?: string;
};

/**
 * Дані категорій. Розміри іконок зафіксовано згідно дизайну Figma.
 * Іконка завжди вписується ВСЕРЕДИНУ кола (140×140).
 * `slug` — це slug у колекції product_categories; клік по картці передає
 * фільтр у /catalog?category=<slug>.
 */
const CATEGORIES: Array<{
  slug: string;
  iconSrc: string;
  iconWidth: number;
  iconHeight: number;
  title: string;
  description: string;
}> = [
  {
    slug: "biopesticide",
    iconSrc: "/@2x.webp",
    iconWidth: 138,
    iconHeight: 106,
    title: "Біоінсектициди",
    description:
      "Знищують шкідників без хімічного навантаження на ґрунт. Безпечні для бджіл та корисних комах.",
  },
  {
    slug: "macro",
    iconSrc: "/5@2x.webp",
    iconWidth: 125,
    iconHeight: 126,
    title: "Мікро/Макроелементи",
    description:
      "Усувають приховані дефіцити, що гальмують урожайність. Швидке засвоєння через хелатну форму.",
  },
  {
    slug: "inoculant",
    iconSrc: "/9@2x.webp",
    iconWidth: 102,
    iconHeight: 119,
    title: "Інокулянти",
    description:
      "Фіксують атмосферний азот - менше витрат на мінеральні добрива.",
  },
  {
    slug: "adjuvant",
    iconSrc: "/sunflower.png",
    iconWidth: 112,
    iconHeight: 87,
    title: "Допоміжні речовини",
    description:
      "Підсилюють дію основних препаратів - покращують змочування, прилипання та проникнення діючих речовин.",
  },
  {
    slug: "rodenticide",
    iconSrc: "/20@2x.webp",
    iconWidth: 105,
    iconHeight: 125,
    title: "Родентициди",
    description:
      "Захищають посіви та зерносховища від гризунів з високою ефективністю.",
  },
  {
    slug: "organic",
    iconSrc: "/22@2x.webp",
    iconWidth: 99,
    iconHeight: 93,
    title: "Органічні добрива",
    description:
      "Відновлюють гумусний шар та мікробіом ґрунту для стабільної врожайності.",
  },
];

const CategorySection1: React.FC<CategorySection1Type> = ({
  className = "",
}) => {
  const navigate = useNavigate();
  return (
    <section className={[styles.categorySection, className].join(" ")}>
      <div className={styles.parent}>
        <RevealHeading
          as="div"
          className={styles.div}
          lineClassName={styles.titleLine}
          block
          baseDelay={100}
          stagger={85}
          lines={[
            [
              { text: "Біотехнології", className: styles.span },
              { text: "захисту", className: styles.span3 },
            ],
            [{ text: "та\u00A0живлення", className: styles.span3 }],
          ]}
        />
        <div className={styles.wrapper}>
          <h3 className={styles.h3}>
            Інноваційні препарати для кожного етапу вегетації. Безпечно для
            ґрунту, безжально до шкідників.
          </h3>
        </div>
      </div>

      <div className={styles.frameParent}>
        <div className={styles.categoryColumnOneParent}>
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.title} {...cat} />
          ))}
        </div>

        <div className={styles.categoryAction}>
          {/*
            Primary Button «Переглянути каталог».
            Figma spec:
              • W Fixed 540px  /  H Hug 60px
              • Padding 18 (top/bottom) · 16 (left/right)
              • Layout: Horizontal, text + arrow → centered together
              • Text: Golos Text Medium 16px #FFFFFF
              • Background: #1B4332 (brand-accent-secondary-default)
              • Border-radius: 6
          */}
          <button
            type="button"
            className={styles.catalogButton}
            data-testid="catalog-cta-button"
            onClick={() => navigate("/catalog")}
          >
            <span className={styles.catalogButtonLabel}>Переглянути каталог</span>
            <span className={styles.catalogButtonArrow} aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10H16M16 10L11 5M16 10L11 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default CategorySection1;
