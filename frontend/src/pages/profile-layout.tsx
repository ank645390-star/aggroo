import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import User1 from "../components/figma/user1";
import Footer1 from "../components/figma/footer1";
import { useUserDrawer } from "../context/UserDrawerContext";
import { useAuth } from "../context/AuthContext";
import styles from "./profile-layout.module.css";

/* =================================================================
   Shared layout for /profile, /profile/addresses, /profile/orders.
     • Compact top-row with "Вихід" + logo + user icon (drawer trigger)
     • Breadcrumb "Мій профіль / [поточна]"
     • H1 + children
     • Reuses Footer1

   ── ВАЖЛИВО ─────────────────────────────────────────────────────────
   Раніше у правому слоті стояв старий <UserDropdown/> (випадаючий
   popover з аватаром + ↓). Тепер тут єдина іконка-кнопка, яка відкриває
   глобальний <UserDrawer/> (рендериться на рівні App.tsx). Це уніфікує
   UX між головним navbar та внутрішніми сторінками профілю.

   Старий компонент user-dropdown.tsx навмисно НЕ видалено — він
   зберігається як резервна реалізація (див. components/figma/user-dropdown.tsx).
   ================================================================= */

type Props = {
  breadcrumb: string;
  title: string;
  children: React.ReactNode;
};

const ProfileLayout: React.FC<Props> = ({ breadcrumb, title, children }) => {
  const { openUserDrawer } = useUserDrawer();
  const { user, isAuthed } = useAuth();
  const navigate = useNavigate();

  /* Чітке розділення ролей: адміністратор не має «профілю покупця».
     Якщо адмін випадково потрапив на /profile/* — редіректимо в /admin. */
  useEffect(() => {
    if (isAuthed && user?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [isAuthed, user, navigate]);

  return (
    <div className={styles.page}>
      {/* ===== Top-row ===== */}
      <header className={styles.topRow}>
        <div className={styles.topRowInner}>
          <Link to="/" className={styles.exitLink} data-testid="profile-exit">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
              <path d="M7 1L1 7L7 13" stroke="#2C2C27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>вихід</span>
          </Link>

          <Link to="/" className={styles.logoWrap} aria-label="ТАМІС АГРО — на головну">
            <img loading="lazy" decoding="async" src="/logo@2x.png" alt="ТОРГОВИЙ ДІМ ТАМІС АГРО" width={128} height={90} />
          </Link>

          <div className={styles.rightSlot}>
            {/* User icon → opens side UserDrawer.
                Chevron removed — icon itself is the trigger. */}
            <button
              type="button"
              className={styles.userTrigger}
              onClick={openUserDrawer}
              aria-label="Особистий кабінет"
              data-testid="profile-user-trigger"
            >
              <User1 size={16} />
            </button>
          </div>
        </div>
        <div className={styles.divider} />
      </header>

      {/* ===== Main ===== */}
      <main className={styles.main}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb} aria-label="Хлібні крихти">
            <Link to="/profile" className={styles.breadcrumbLink}>Мій профіль</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>{breadcrumb}</span>
          </nav>
          <h1 className={styles.h1}>{title}</h1>
          {children}
        </div>
      </main>

      <Footer1 />
    </div>
  );
};

export default ProfileLayout;
