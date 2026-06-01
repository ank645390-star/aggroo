import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import Navbar1 from "../components/figma/navbar1";
import Footer1 from "../components/figma/footer1";
import RevealHeading from "../components/welcome/reveal-heading";
import { useCallbackModal } from "../context/CallbackContext";
import { useEmailModal } from "../context/EmailModalContext";
import { useContactInfo } from "../context/ContactInfoContext";
import { listFaqPublic, type FaqItem } from "../lib/faq-api";
import styles from "./contacts.module.css";

/* =====================================================================
   Contacts page — TAMIS АГРО.
   Реалізовано pixel-perfect за дизайном desktop4.tsx + desktop4.module.css
   ===================================================================== */

// Fallback (показуємо, якщо API недоступний)
const FAQ_FALLBACK: FaqItem[] = [
  { id: "f1", q: "Що таке біопрепарати в аграрній сфері та як вони працюють?", a: "Біопрепарати — це натуральні засоби на основі корисних мікроорганізмів, бактерій або органічних компонентів, які допомагають покращити ріст рослин, підвищити врожайність та відновити родючість ґрунту без агресивної хімії.", order: 0 },
  { id: "f2", q: "Які переваги використання біопрепаратів для сільського господарства?", a: "Підвищують урожайність, покращують структуру ґрунту, безпечні для людини, тварин і навколишнього середовища, дозволяють отримати екологічно чисту продукцію.", order: 1 },
  { id: "f3", q: "Чи можна поєднувати біопрепарати з хімічними добривами та ЗЗР?", a: "Так, у більшості випадків біопрепарати сумісні з мінеральними добривами та засобами захисту рослин. Однак рекомендуємо консультацію зі спеціалістом.", order: 2 },
  { id: "f4", q: "Для яких культур підходять біопрепарати?", a: "Лінійка TAMIS підходить для зернових, олійних, овочевих та плодово-ягідних культур.", order: 3 },
  { id: "f5", q: "Коли найкраще вносити біопрепарати для максимального ефекту?", a: "Залежно від типу: на стадії передпосівної обробки насіння, при основних обробках вегетації або під час збору врожаю.", order: 4 },
  { id: "f6", q: "Чи є сертифікат якості?", a: "Так, усі наші препарати мають сертифікати якості та офіційну реєстрацію в Україні.", order: 5 },
];

const IconClockWhite: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M3.33 20C3.33 10.795 10.795 3.33 20 3.33C29.205 3.33 36.67 10.795 36.67 20C36.67 29.205 29.205 36.67 20 36.67C10.795 36.67 3.33 29.205 3.33 20Z" stroke="#F9F7F2" strokeWidth="1.67" strokeLinecap="square"/>
    <path d="M20 10.83V20L25 25" stroke="#F9F7F2" strokeWidth="1.67" strokeLinecap="square"/>
  </svg>
);
const IconCallSmall: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M21.97 18.33a2.5 2.5 0 0 1-2.5 2.5C9.95 20.83 3.17 14.05 3.17 4.53a2.5 2.5 0 0 1 2.5-2.5h2.5a1 1 0 0 1 1 .79l.95 4.27a1 1 0 0 1-.27.93l-1.7 1.7a14.5 14.5 0 0 0 6.13 6.13l1.7-1.7a1 1 0 0 1 .93-.27l4.27.95a1 1 0 0 1 .79 1v2.5Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round"/>
  </svg>
);
const IconPlus: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);
const IconMinus: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
);

const Contacts: React.FC = () => {
  const { openModal: openCallback } = useCallbackModal();
  const { openEmailModal } = useEmailModal();
  const { info } = useContactInfo();
  const [faqItems, setFaqItems] = useState<FaqItem[]>(FAQ_FALLBACK);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // Fetch FAQ from API on mount; usable fallback if API fails
  useEffect(() => {
    let mounted = true;
    listFaqPublic()
      .then((items) => {
        if (mounted && items && items.length) setFaqItems(items);
      })
      .catch(() => { /* keep fallback */ });
    return () => { mounted = false; };
  }, []);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  return (
    <div className={styles.page} data-testid="contacts-page">
      <Seo
        title="Контакти — Звʼязатися з нами"
        description="Звʼяжіться з ТАМІС АГРО: безкоштовна консультація агронома, замовлення дзвінка, FAQ. Підтримка фермерів по всій Україні."
        canonical="/contacts"
      />
      <section className={styles.navbarParent}>
        <Navbar1 device="Desktop" state="Default" size="20" size1="20" size2="16" />

        <div className={styles.contactSectionWrapper}>
          <div className={styles.contactSection}>
            <section className={styles.contactHeader}>
              <div className={styles.breadcrumb}>
                <Link to="/">Головна</Link>
                <span className={styles.breadcrumbSep}>/</span>
                <span className={styles.current}>Контакти</span>
              </div>

              <div className={styles.parent}>
                <RevealHeading
                  as="h1"
                  className={styles.title}
                  baseDelay={100}
                  stagger={80}
                  lines={[
                    [
                      { text: "Завжди відкриті", className: styles.titleStrong },
                      { text: "до спілкування", className: styles.titleMuted },
                    ],
                  ]}
                />
                <p className={styles.heroDescription}>
                  Цінуємо ваш час, тому забезпечуємо швидкий зворотний зв'язок та індивідуальний супровід:
                  від вибору препарату до результату на полі.
                </p>
              </div>
            </section>

            <div className={styles.contactInformation}>
              <img decoding="async"
                className={styles.heroImage}
                src="/contacts-farmer-hero.webp"
                alt="Агроном в полі"
                width={828}
                height={554}
                loading="lazy"
              />

              <section className={styles.contactData}>
                <div className={styles.contactCard}>
                  <div className={styles.cardIcon}>
                    <img loading="lazy" decoding="async" src="/contacts-icon-call.png" alt="" width={60} height={60} />
                  </div>
                  <div className={styles.cardText}>
                    <span className={styles.cardLabel}>Телефон</span>
                    <span className={styles.cardValueMono}>
                      <a
                        href={`tel:${info.phone_primary_tel}`}
                        className={styles.phoneLink}
                        data-testid="contacts-phone-1"
                      >
                        {info.phone_primary}
                      </a>
                      <br />
                      <a
                        href={`tel:${info.phone_secondary_tel}`}
                        className={styles.phoneLink}
                        data-testid="contacts-phone-2"
                      >
                        {info.phone_secondary}
                      </a>
                    </span>
                  </div>
                </div>
                <div className={styles.contactCard}>
                  <div className={styles.cardIcon}>
                    <img loading="lazy" decoding="async" src="/contacts-icon-message.png" alt="" width={60} height={60} />
                  </div>
                  <div className={styles.cardText}>
                    <span className={styles.cardLabel}>Пошта</span>
                    <a
                      href={`mailto:${info.email}`}
                      className={`${styles.cardValueLight} ${styles.phoneLink}`}
                      data-testid="contacts-email"
                      onClick={(e) => {
                        e.preventDefault();
                        openEmailModal({ defaultSubject: "" });
                      }}
                    >
                      {info.email}
                    </a>
                  </div>
                </div>
                <div className={styles.contactCard}>
                  <div className={styles.cardIcon}>
                    <img loading="lazy" decoding="async" src="/contacts-icon-clock.png" alt="" width={60} height={60} />
                  </div>
                  <div className={styles.cardText}>
                    <span className={styles.cardLabel}>Графік роботи</span>
                    <span className={styles.cardValueLight}>Понеділок – Субота: 9:00 – 21:00</span>
                  </div>
                </div>
                <div className={styles.contactCard}>
                  <div className={styles.cardIcon}>
                    <img loading="lazy" decoding="async" src="/contacts-icon-location.png" alt="" width={60} height={60} />
                  </div>
                  <div className={styles.cardText}>
                    <span className={styles.cardLabel}>Адреса</span>
                    <span className={styles.cardValueLight}>
                      55200, м. Первомайськ,<br />
                      вул. Київська 135, Миколаївська обл.
                    </span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONSULTATION ===== */}
      <section className={styles.consultationSection}>
        <div className={styles.consultationTitleWrap}>
          <h2 className={styles.consultationTitle}>
            <span className={styles.consultTitleStrong}>Не знайшли </span>
            <span className={styles.consultTitleMuted}>своє рішення</span>
            <span className={styles.consultTitleMuted}> ?</span>
          </h2>
        </div>

        <div className={styles.consultationBgBlock}>
          <div className={styles.consultationContent}>
            <div className={styles.featureBlock}>
              <div className={styles.featureIcon}><IconClockWhite /></div>
              <div className={styles.featureText}>
                <div className={styles.featureBig}>24 год</div>
                <div className={styles.featureSub}>Середній час відповіді нашого консультанта</div>
              </div>
            </div>

            <div className={styles.textBlock}>
              <div className={styles.consultationText}>
                <span>Розкажіть нам про вашу культуру та задачу — підготуємо безкоштовно </span>
                <b className={styles.consultationBold}>індивідуальну схему біозахисту</b>
                <span> з розрахунком витрат на ваші угіддя.</span>
              </div>
              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={openCallback}
                  data-testid="contacts-consult-btn"
                >
                  Отримати консультацію
                  <IconCallSmall />
                </button>
                <div className={styles.phoneText}>
                  <a href={`tel:${info.phone_primary_tel}`} className={styles.phoneLink} data-testid="contacts-consult-phone">
                    {info.phone_primary}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <main className={styles.faqSection}>
        <div className={styles.faqColumn}>
          <div className={styles.faqTitle}>
            <span className={styles.faqSpanCasti}>Часті </span>
            <span className={styles.faqSpanZap}>запитання</span>
          </div>

          <div className={styles.faqList} data-testid="faq-list">
            {faqItems.map((item, i) => {
              const isOpen = openIds.has(item.id);
              return (
                <React.Fragment key={item.id}>
                  {i > 0 && <div className={styles.faqDivider} />}
                  <div className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`} data-testid={`faq-item-${i}`}>
                    <button type="button" className={styles.faqHeader} onClick={() => toggle(item.id)} aria-expanded={isOpen}>
                      <div className={styles.faqQuestion}>{item.q}</div>
                      <div className={styles.faqToggle} aria-hidden="true">
                        {isOpen ? <IconMinus /> : <IconPlus />}
                      </div>
                    </button>
                    {isOpen && <div className={styles.faqAnswer}>{item.a}</div>}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <img decoding="async"
          className={styles.faqImage}
          src="/contacts-faq-plants.webp"
          alt="Здорова та хвора рослина"
          width={978}
          height={968}
          loading="lazy"
        />
      </main>

      {/* ===== FOOTER (default, same as Welcome) ===== */}
      <Footer1 device="Desktop" />
    </div>
  );
};

export default Contacts;
