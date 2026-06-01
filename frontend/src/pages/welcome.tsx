import React from "react";
import Seo from "../components/Seo";
import FrameComponent7 from "../components/welcome/frame-component7";
import FrameComponent8 from "../components/welcome/frame-component8";
import MissionSection1 from "../components/welcome/mission-section1";
import CategorySection1 from "../components/welcome/category-section1";
import HowItWorksSection1 from "../components/welcome/how-it-works-section1";
import FrameComponent11 from "../components/welcome/frame-component11";
import FrameComponent9 from "../components/welcome/frame-component9";
import FrameComponent10 from "../components/welcome/frame-component10";
import CtaSection1 from "../components/welcome/cta-section1";
import ReviewArea1 from "../components/welcome/review-area1";
import AboutCompany1 from "../components/welcome/about-company1";
import BlogPart1 from "../components/welcome/blog-part1";
import Footer1 from "../components/figma/footer1";
import styles from "./welcome.module.css";

const Welcome: React.FC = () => {
  return (
    <div className={styles.desktop}>
      <Seo
        title="ТАМІС АГРО — Час біорішень настав"
        description="Біопрепарати для агрокультур: зернові, бобові, технічні. +20 років досвіду, +5000 фермерів, +350 тис. га оброблених полів. Безкоштовна консультація."
        canonical="/"
        image="/hero-section@3x.webp"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "TAMIS АГРО",
          url: "https://tamis-agro.ua/",
          inLanguage: "uk",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://tamis-agro.ua/catalog?search={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <FrameComponent7 />
      <section className={styles.frameParent}>
        <FrameComponent8 />
        <MissionSection1 />
      </section>
      <CategorySection1 />
      <div className={styles.howItWorksAgroCombo}>
        <HowItWorksSection1 />
      </div>
      <FrameComponent11 />
      <main className={styles.frameGroup}>
        <section className={styles.headlineWrapper}>
          <div className={styles.headline}>
            <div className={styles.div}>
              <span className={styles.span}>
                <span className={styles.span2}>Біологія</span>
                <span className={styles.span3}>{` `}</span>
              </span>
              <span className={styles.span4}>
                <span className={styles.span5}>замість хімії</span>
                <span className={styles.span6}>{` `}</span>
              </span>
            </div>
            <div className={styles.bottomRow}>
              <h2
                className={styles.h2}
              >{`Один ґрунт.  Два підходи. Різний результат. `}</h2>
            </div>
          </div>
        </section>
        <FrameComponent9 />
        <FrameComponent10 align="center" />
        <CtaSection1 />
      </main>
      <ReviewArea1 />
      <AboutCompany1 />
      <BlogPart1 />
      <Footer1 device="Desktop" />
    </div>
  );
};

export default Welcome;
