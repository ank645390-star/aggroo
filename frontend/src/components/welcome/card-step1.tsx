import React from "react";
import styles from "./card-step1.module.css";

export type CardStep1Type = {
  className?: string;
  stepNumber?: string;
  title?: string;
  description?: string;
};

const CardStep1: React.FC<CardStep1Type> = ({
  className = "",
  stepNumber,
  title,
  description,
}) => {
  return (
    <section className={[styles.navbarcardStep, className].join(" ")}>
      <h2 className={styles.stepNumber}>{stepNumber}</h2>
      <div className={styles.textContent}>
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.description}>{description}</div>
      </div>
    </section>
  );
};

export default CardStep1;
