import React from "react";
import styles from "./feature-block1.module.css";

export type FeatureBlock1Type = {
  /** Текст блока — редактируется из родителя. */
  label?: string;
  /** Иконка слева. По умолчанию — белый термометр. */
  iconSrc?: string;
  className?: string;
};

/**
 * Tag-блок «Суворий температурний контроль кожної партії препаратів».
 * Дизайн (Figma): 406 × 138, radius 6, padding 16, gap 4.
 * Фон: solid #ACB14F (НЕ полупрозрачный — мы поверх фотографии поля,
 * любая прозрачность даст «грязный» результат, как стало видно в превью).
 * Текст: Golos Text SemiBold 18px, белый.
 */
const FeatureBlock1: React.FC<FeatureBlock1Type> = ({
  label = "Суворий температурний контроль кожної партії препаратів",
  iconSrc = "/left-icon-thermometer.png",
  className = "",
}) => {
  return (
    <div
      className={[styles.featureBlock, className].join(" ")}
      data-testid="feature-temperature-block"
    >
      <div className={styles.iconWrap}>
        <img loading="lazy" decoding="async"
          className={styles.iconImg}
          src={iconSrc}
          alt=""
          width={60}
          height={60}
        />
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
};

export default FeatureBlock1;
