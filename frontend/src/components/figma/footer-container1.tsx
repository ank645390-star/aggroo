import React from "react";
import { Link } from "react-router-dom";
import { useContactInfo } from "../../context/ContactInfoContext";
import { useEmailModal } from "../../context/EmailModalContext";
import { usePolicies } from "../../context/PolicyContext";
import type { PolicyType } from "../../lib/policies-api";
import styles from "./footer-container1.module.css";

export type FooterContainer1Type = {
  className?: string;
};

const FooterContainer1: React.FC<FooterContainer1Type> = ({
  className = "",
}) => {
  const { info } = useContactInfo();
  const { openEmailModal } = useEmailModal();
  const { policies, openPolicy } = usePolicies();

  const policyOrder: PolicyType[] = ["cookie", "privacy", "terms"];
  const policyButtons = policyOrder
    .map((t) => policies.find((p) => p.type === t))
    .filter(Boolean) as Array<{ type: PolicyType; button_label: string }>;
  return (
    <div className={[styles.footerContainer, className].join(" ")}>
      <div className={styles.mainRow}>
        <img loading="lazy" decoding="async"
          className={styles.logoIcon}
          width={366}
          height={261}
          alt=""
          src="/logo@2x.png"
        />
        <div className={styles.colum}>
          <div className={styles.navColumn}>
            <b className={styles.b}>Контакти:</b>
            <div className={styles.b}>
              <a
                href={`tel:${info.phone_primary_tel}`}
                className={styles.contactLink}
                data-testid="footer-phone-1"
              >
                {info.phone_primary}
              </a>
              <br />
              <a
                href={`tel:${info.phone_secondary_tel}`}
                className={styles.contactLink}
                data-testid="footer-phone-2"
              >
                {info.phone_secondary}
              </a>
              <br />
              <a
                href={`mailto:${info.email}`}
                className={styles.contactLink}
                data-testid="footer-email"
                onClick={(e) => {
                  e.preventDefault();
                  openEmailModal({ defaultSubject: "" });
                }}
              >
                {info.email}
              </a>
            </div>
          </div>
          <div className={styles.navColumn}>
            <b className={styles.b}>Нашим клієнтам:</b>
            <div className={styles.navLinks}>
              <Link to="/catalog" className={`${styles.div} ${styles.navLink}`}>
                Товари та послуги
              </Link>
              <Link to="/about" className={`${styles.div} ${styles.navLink}`}>
                Про нас
              </Link>
              <Link
                to="/blog"
                className={`${styles.div} ${styles.navLink}`}
                data-testid="footer-blog-link"
              >
                Блог
              </Link>
              <Link to="/contacts" className={`${styles.div} ${styles.navLink}`}>
                Повернення товару
              </Link>
            </div>
          </div>
          <div className={styles.navColumn}>
            <b className={styles.b}>Наша адреса:</b>
            <div className={styles.b}>
              {info.address.split(",").map((part, i, arr) => (
                <React.Fragment key={i}>
                  {part.trim()}
                  {i < arr.length - 1 ? "," : ""}
                  {i < arr.length - 1 ? <br /> : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.socialLinks}>
        <div className={styles.socialWrapper}>
          <div className={styles.socialInner}>
            <b className={styles.b}>Ми в соціальних мережах :</b>
            <div className={styles.iconsRow}>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIconLink}
                aria-label="Facebook"
              >
                <img
                  decoding="async"
                  className={styles.groupIcon}
                  loading="lazy"
                  width={32}
                  height={32}
                  alt="Facebook"
                  src="/Group.svg"
                />
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIconLink}
                aria-label="Instagram"
              >
                <img
                  loading="lazy"
                  decoding="async"
                  className={styles.groupIcon2}
                  width={32}
                  height={32}
                  alt="Instagram"
                  src="/Group.svg"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.copyrightContainer}>
        {/* LEFT: © 2026. Всі права захищено */}
        <div className={styles.copyrightLeft}>
          <img decoding="async"
            className={styles.antDesigncopyrightCircleOuIcon}
            loading="lazy"
            width={18}
            height={18}
            alt=""
            src="/ant-design-copyright-circle-outlined.svg"
          />
          <div className={styles.div6}>
            2026. Всі права захищено.
          </div>
        </div>

        {/* CENTER: Cookie Policy | Privacy Policy | Terms of Use */}
        {policyButtons.length > 0 && (
          <div className={styles.policyLinks} data-testid="footer-policy-buttons">
            {policyButtons.map((p) => (
              <button
                key={p.type}
                type="button"
                className={styles.policyLink}
                onClick={() => openPolicy(p.type)}
                data-testid={`footer-policy-${p.type}`}
              >
                {p.button_label}
              </button>
            ))}
          </div>
        )}

        {/* RIGHT: Сайт створено - www.olhalazarieva.com */}
        <div className={styles.creditRowTop}>
          <span className={styles.creditLabel}>Сайт створено -</span>
          <a
            className={styles.creditLink}
            href="https://www.olhalazarieva.com"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="footer-designer-link"
          >
            www.olhalazarieva.com
          </a>
        </div>
      </div>
    </div>
  );
};

export default FooterContainer1;
