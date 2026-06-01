import React from "react";
import FooterContainer1 from "./footer-container1";
import styles from "./footer1.module.css";

export type Footer1Type = {
  className?: string;

  /** Variant props */
  device?: any;
};

/* Per design spec 29.05.2026 mobile order:
   1. Logo
   2. Контакти:
   3. Нашим клієнтам:
   4. Наша адреса:
   5. Ми в соціальних мережах :
   6. Сайт створено - www.olhalazarieva.com
   7. © 2026. Всі права захищено

   The entire footer body (including the social block and credits) is
   rendered inside FooterContainer1 so that mobile flex flow stays
   straightforward. Desktop continues to use absolute positioning on
   .socialLinks (preserved via the same CSS class). */
const Footer1: React.FC<Footer1Type> = ({
  className = "",
  device = "Desktop",
}) => {
  return (
    <footer
      className={[styles.footer, className].join(" ")}
      data-device={device}
    >
      <div className={styles.background} />
      <FooterContainer1 />
    </footer>
  );
};

export default Footer1;
