import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserDrawer } from "../../context/UserDrawerContext";
import { useAuth } from "../../context/AuthContext";
import { fetchProfile } from "../../lib/profile-api";
import styles from "./UserDrawer.module.css";

/* =====================================================================
   UserDrawer — компактна бокова панель справа (аналогічно CartDrawer,
   але менша: 380 px, бо секція профілю містить всього кілька позицій).

   Рендериться в App.tsx поза scale-wrapper'ом, щоб мати реальний viewport.

   Старий UserDropdown залишається в коді як резервна версія.
   ===================================================================== */

const FALLBACK_USER = { firstName: "Іван", lastName: "Петренко", email: "i.petrenko@gmail.com" };

const CloseIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 5L15 15M15 5L5 15" stroke="#2C2C27" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const PersonIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="3.2" stroke="#2C2C27" strokeWidth="1.4"/>
    <path d="M2.5 15.5C2.5 12.7 5.4 10.5 9 10.5C12.6 10.5 15.5 12.7 15.5 15.5" stroke="#2C2C27" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const PinIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 1.6c-2.9 0-5.3 2.4-5.3 5.3 0 3.7 5.3 8.5 5.3 8.5s5.3-4.8 5.3-8.5C14.3 4 11.9 1.6 9 1.6Z" stroke="#2C2C27" strokeWidth="1.4" strokeLinejoin="round"/>
    <circle cx="9" cy="6.8" r="1.8" stroke="#2C2C27" strokeWidth="1.4"/>
  </svg>
);
const BoxIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.6 5.5L9 2L15.4 5.5V12.5L9 16L2.6 12.5V5.5Z" stroke="#2C2C27" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M2.6 5.5L9 9M9 9L15.4 5.5M9 9V16" stroke="#2C2C27" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LogoutIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M11 3V2.5C11 1.7 10.3 1 9.5 1H3C2.2 1 1.5 1.7 1.5 2.5V15.5C1.5 16.3 2.2 17 3 17H9.5C10.3 17 11 16.3 11 15.5V15" stroke="#c14a3c" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 9H16M16 9L13 6M16 9L13 12" stroke="#c14a3c" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ChevronRight: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M5 2L10 7L5 12" stroke="#93928C" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserDrawer: React.FC = () => {
  const { isOpen, closeUserDrawer } = useUserDrawer();
  const { isAuthed, user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(FALLBACK_USER);

  // Підвантажуємо реальний профіль / акаунт при кожному відкритті.
  useEffect(() => {
    if (!isOpen) return;
    // Якщо користувач залогінений — беремо дані з акаунту
    if (isAuthed && user) {
      setProfileUser({
        firstName: user.firstName || FALLBACK_USER.firstName,
        lastName: user.lastName || FALLBACK_USER.lastName,
        email: user.email || FALLBACK_USER.email,
      });
      return;
    }
    // Гість — пробуємо session-based профіль (legacy demo)
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchProfile();
        if (!cancelled) {
          setProfileUser({
            firstName: p.firstName || FALLBACK_USER.firstName,
            lastName: p.lastName || FALLBACK_USER.lastName,
            email: p.email || FALLBACK_USER.email,
          });
        }
      } catch { /* fallback */ }
    })();
    return () => { cancelled = true; };
  }, [isOpen, isAuthed, user]);

  const handleNav = (path: string) => {
    closeUserDrawer();
    navigate(path);
  };

  const handleLogout = () => {
    closeUserDrawer();
    // Невелика затримка щоб анімація закриття встигла
    setTimeout(() => {
      logout();
      navigate("/", { replace: true });
    }, 50);
  };

  const u = profileUser;

  return (
    <>
      <div
        className={[styles.backdrop, isOpen ? styles.backdropOpen : ""].join(" ")}
        onClick={closeUserDrawer}
        aria-hidden={!isOpen}
      />
      <aside
        className={[styles.drawer, isOpen ? styles.drawerOpen : ""].join(" ")}
        aria-hidden={!isOpen}
        aria-label="Особистий кабінет"
        role="dialog"
        data-testid="user-drawer"
      >
        {/* ===== Header ===== */}
        <header className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>Мій профіль</h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={closeUserDrawer}
            aria-label="Закрити панель"
            data-testid="user-drawer-close"
          >
            <CloseIcon />
          </button>
        </header>

        {/* ===== User block ===== */}
        <section className={styles.userBlock}>
          <div className={styles.avatar} aria-hidden="true">
            {(u.firstName?.[0] || "?").toUpperCase()}
            {(u.lastName?.[0] || "").toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {u.firstName} {u.lastName}
            </div>
            <div className={styles.userEmail}>{u.email}</div>
          </div>
        </section>

        {/* ===== Nav links =====
            Чітке розділення: адміністратор бачить ТІЛЬКИ "Адмінпанель",
            звичайний користувач — особисті дані / адреси / історія замовлень.
            (Адмін не має «профілю покупця» — лише доступ до /admin.) */}
        <nav className={styles.nav}>
          {isAuthed && user?.role === "admin" ? (
            <button
              type="button"
              className={styles.navItem}
              onClick={() => handleNav("/admin")}
              data-testid="user-drawer-admin"
              style={{ background: "rgba(179,210,23,0.18)", color: "#1b4332", fontWeight: 600 }}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8.5-4.5-1-8-3.5-8-8.5V7l8-4Z" stroke="#1b4332" strokeWidth="1.6" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" stroke="#1b4332" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className={styles.navLabel}>Адмінпанель</span>
              <span className={styles.navChevron}><ChevronRight /></span>
            </button>
          ) : (
            <>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => handleNav("/profile")}
                data-testid="user-drawer-profile"
              >
                <span className={styles.navIcon}><PersonIcon /></span>
                <span className={styles.navLabel}>Особисті дані</span>
                <span className={styles.navChevron}><ChevronRight /></span>
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => handleNav("/profile/addresses")}
                data-testid="user-drawer-addresses"
              >
                <span className={styles.navIcon}><PinIcon /></span>
                <span className={styles.navLabel}>Адреси доставки</span>
                <span className={styles.navChevron}><ChevronRight /></span>
              </button>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => handleNav("/profile/orders")}
                data-testid="user-drawer-orders"
              >
                <span className={styles.navIcon}><BoxIcon /></span>
                <span className={styles.navLabel}>Історія замовлень</span>
                <span className={styles.navChevron}><ChevronRight /></span>
              </button>
            </>
          )}
        </nav>

        <div className={styles.spacer} />

        {/* ===== Logout ===== */}
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={handleLogout}
          data-testid="user-drawer-logout"
        >
          <LogoutIcon />
          <span>Вихід</span>
        </button>
      </aside>
    </>
  );
};

export default UserDrawer;
