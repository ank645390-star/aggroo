import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import User1 from "./user1";
import styles from "./user-dropdown.module.css";

/* =================================================================
   Header user icon → click → dropdown panel with:
     • user info (name + e-mail)
     • links to 3 profile sub-pages
     • Вихід
   ================================================================= */

type Props = { size?: number };

const USER = { name: "Іван Петренко", email: "ivan@example.com" };

const ChevronDown: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="12" height="6" viewBox="0 0 12 6" fill="none" aria-hidden="true"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s ease" }}>
    <path d="M1 1L6 5L11 1" stroke="#2C2C27" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UserDropdown: React.FC<Props> = ({ size = 16 }) => {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = () => {
    setOpen(false);
    navigate("/");
  };

  return (
    <div ref={wrapRef} className={styles.wrap} data-open={open ? "true" : "false"}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Особистий кабінет"
        data-testid="header-user-toggle"
      >
        <span className={styles.avatar}>
          <User1 size={size} />
        </span>
        <ChevronDown open={open} />
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHeader}>
            <div className={styles.title}>
              <span className={styles.name}>{USER.name}</span>
              <span className={styles.email}>{USER.email}</span>
            </div>
          </div>
          <nav className={styles.options}>
            <Link to="/profile"  className={styles.option} onClick={() => setOpen(false)} data-testid="header-user-profile">
              <PersonIcon /> <span>Особисті дані</span>
            </Link>
            <Link to="/profile/addresses" className={styles.option} onClick={() => setOpen(false)} data-testid="header-user-addresses">
              <PinIcon /> <span>Адреси доставки</span>
            </Link>
            <Link to="/profile/orders" className={styles.option} onClick={() => setOpen(false)} data-testid="header-user-orders">
              <BoxIcon /> <span>Історія замовлень</span>
            </Link>
            <div className={styles.divider} />
            <button type="button" className={styles.option + " " + styles.optionLogout} onClick={handleLogout} data-testid="header-user-logout">
              <LogoutIcon /> <span>Вихід</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

/* ---------- Mini icons ---------- */
const PersonIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="3.2" stroke="#2C2C27" strokeWidth="1.3"/>
    <path d="M2.5 15.5C2.5 12.7 5.4 10.5 9 10.5C12.6 10.5 15.5 12.7 15.5 15.5" stroke="#2C2C27" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);
const PinIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M9 1.6c-2.9 0-5.3 2.4-5.3 5.3 0 3.7 5.3 8.5 5.3 8.5s5.3-4.8 5.3-8.5C14.3 4 11.9 1.6 9 1.6Z" stroke="#2C2C27" strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="9" cy="6.8" r="1.8" stroke="#2C2C27" strokeWidth="1.3"/>
  </svg>
);
const BoxIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M2.6 5.5L9 2L15.4 5.5V12.5L9 16L2.6 12.5V5.5Z" stroke="#2C2C27" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M2.6 5.5L9 9M9 9L15.4 5.5M9 9V16" stroke="#2C2C27" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LogoutIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M11 3V2.5C11 1.7 10.3 1 9.5 1H3C2.2 1 1.5 1.7 1.5 2.5V15.5C1.5 16.3 2.2 17 3 17H9.5C10.3 17 11 16.3 11 15.5V15" stroke="#c14a3c" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M7 9H16M16 9L13 6M16 9L13 12" stroke="#c14a3c" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default UserDropdown;
