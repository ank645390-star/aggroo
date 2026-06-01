import React from "react";
import Lightning1 from "./lightning1";
import EcoProtection1 from "./eco-protection1";
import Drop1 from "./drop1";
import styles from "./image2.module.css";

export type Image2Chip = {
  icon?: "lightning" | "eco" | "drop" | "shield" | "leaf";
  title?: string;
  body?: string;
  /** Color variant — green | dark | cream */
  variant?: "green" | "dark" | "cream";
};

export type Image2Type = {
  className?: string;
  /** Hero image URL (defaults to /tree.webp) */
  heroImage?: string;
  /** Alt text for the hero image */
  heroAlt?: string;
  /** Optional override of the 3 floating chips; if omitted — uses original Figma defaults */
  chips?: Image2Chip[];
};

const DEFAULT_CHIPS: Image2Chip[] = [
  {
    icon: "lightning",
    title: "Швидке відновлення",
    body: "Відновлення життєдіяльності рослин після стресу протягом короткого терміну",
    variant: "green",
  },
  {
    icon: "eco",
    title: "Ідеальний pH-баланс води",
    body: "Захищає дорогі пестициди від швидкого руйнування у жорсткій воді, покращуючи їх сумісність із рослиною.",
    variant: "dark",
  },
  {
    icon: "drop",
    title: "Покращення поглинання",
    body: "Впливає на рівномірне покриття листя та засвоєння активних речовин",
    variant: "cream",
  },
];

/* Map icon enum → component (size matches design 36px) */
const renderIcon = (icon: Image2Chip["icon"]) => {
  switch (icon) {
    case "eco":
      return <EcoProtection1 size={36} />;
    case "drop":
      return <Drop1 size={36} dropHeight="36px" dropWidth="36px" />;
    case "lightning":
    default:
      return <Lightning1 size={36} />;
  }
};

const variantToClass = (v: Image2Chip["variant"]): string => {
  if (v === "dark") return styles.chip2;
  if (v === "cream") return styles.chip3;
  return styles.chip1;
};

const Image2: React.FC<Image2Type> = ({
  className = "",
  heroImage = "/tree.webp",
  heroAlt = "Дерево — відновлення після стресу",
  chips,
}) => {
  const list = (chips && chips.length > 0 ? chips : DEFAULT_CHIPS).slice(0, 3);
  return (
    <div className={[styles.image, className].join(" ")}>
      <div className={styles.imageParent}>
        <img
          loading="lazy"
          decoding="async"
          className={styles.imageIcon}
          width={1376}
          height={601}
          alt={heroAlt}
          src={heroImage || "/tree.webp"}
        />
        <div className={styles.overlay} />
      </div>

      {list.map((c, i) => (
        <div key={i} className={`${styles.chip} ${variantToClass(c.variant)}`}>
          <div className={styles.chipIcon}>{renderIcon(c.icon)}</div>
          <div className={styles.chipText}>
            <div className={styles.chipTitle}>{c.title}</div>
            <div className={styles.chipBody}>{c.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Image2;
