import React from "react";
import ArrowSwitcher1 from "./arrow-switcher1";
import styles from "./headline1.module.css";

export type Headline1Type = {
  className?: string;
};

const Headline1: React.FC<Headline1Type> = ({ className = "" }) => {
  return (
    <section className={[styles.headline, className].join(" ")}>
      <div className={styles.div}>
        <span className={styles.span}>{`Товари, `}</span>
        <span className={styles.span2}>які купують разом</span>
      </div>
      <ArrowSwitcher1
        active="Both"
        size="Large"
        size1="Large"
        state="Default"
        size2="Large"
        state1="Default"
      />
    </section>
  );
};

export default Headline1;
