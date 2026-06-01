import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import Search1 from "./search1";
import User1 from "./user1";
import Cart1 from "./cart1";
import { useCallbackModal } from "../../context/CallbackContext";
import { useCart } from "../../context/CartContext";
import { useUserDrawer } from "../../context/UserDrawerContext";
import { useAuth } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import styles from "./mobile-menu.module.css";

/* =================================================================
   MobileMenu — full-screen drawer for mobile header burger.
   ----------------------------------------------------------------
   Per the design (Меню.png screenshot 1 — 375×56 header strip):
     • Top row INSIDE drawer (matches navbar but explicit):
         display:flex; width:375px; height:56px;
         padding:10px 24px; justify-content:space-between;
         align-items:center;
       → Logo (left) + User · Cart icons + Burger/Close (right)
     • Search field (8px radius, full width, "Пошук...")
     • Vertical nav: Каталог · Культури · Про нас · Контакти
       — Golos Text 18px / 600 / 120% line-height / #2C2C27
       — 1px dividers between each
     • Bottom: phones + email
     • Bottom CTA: "Замовити дзвінок →" (full-width brand-green)
   ================================================================= */

type Props = {
  open: boolean;
  onClose: () => void;
};

const NAV_ITEMS: Array<{ label: string; to: string; testId: string }> = [
  { label: "Каталог", to: "/catalog", testId: "mobile-menu-catalog" },
  { label: "Культури", to: "/cultures", testId: "mobile-menu-cultures" },
  { label: "Про нас", to: "/about", testId: "mobile-menu-about" },
  { label: "Контакти", to: "/contacts", testId: "mobile-menu-contacts" },
];

const MobileMenu: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { openModal: openCallback } = useCallbackModal();
  const { count, openCart } = useCart();
  const { openUserDrawer } = useUserDrawer();
  const { isAuthed, user } = useAuth();
  const { openAuth } = useAuthModal();
  const [query, setQuery] = useState("");

  // Lock body scroll when open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = query.trim();
      navigate(`/catalog${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      onClose();
      setQuery("");
    },
    [query, navigate, onClose],
  );

  const handleCallback = useCallback(() => {
    onClose();
    // tiny delay so close animation/state lands before modal opens
    setTimeout(() => openCallback(), 80);
  }, [onClose, openCallback]);

  const handleUserClick = useCallback(() => {
    onClose();
    setTimeout(() => {
      if (isAuthed) openUserDrawer();
      else openAuth("login");
    }, 80);
  }, [onClose, isAuthed, openUserDrawer, openAuth]);

  const handleCartClick = useCallback(() => {
    onClose();
    setTimeout(() => openCart(), 80);
  }, [onClose, openCart]);

  const handleLogoClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Portal>
      <div
        className={styles.drawer}
        data-open={open ? "true" : "false"}
        aria-hidden={!open}
        data-testid="mobile-menu-drawer"
      >
        {/* ── Sticky drawer header (mirrors navbar exactly per spec) ── */}
        <div className={styles.drawerHeader}>
          <Link
            to="/"
            aria-label="На головну"
            className={styles.logoLink}
            onClick={handleLogoClick}
            data-testid="mobile-menu-logo"
          >
            <img
              decoding="async"
              className={styles.logoImg}
              loading="lazy"
              width={90}
              height={64}
              alt="Торговий дім ТАМІС АГРО"
              src="/logo@2x.png"
            />
          </Link>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={[
                styles.iconBtn,
                isAuthed ? styles.iconBtnAuthed : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={handleUserClick}
              aria-label={isAuthed ? "Особистий кабінет" : "Увійти до акаунту"}
              data-testid="mobile-menu-user-trigger"
              data-authed={isAuthed ? "true" : "false"}
            >
              {isAuthed ? (
                <span className={styles.userInitial} aria-hidden="true">
                  {((user?.firstName?.[0] || user?.email?.[0] || "U") + "").toUpperCase()}
                </span>
              ) : (
                <User1 size={16} />
              )}
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleCartClick}
              aria-label="Відкрити кошик"
              data-testid="mobile-menu-cart-trigger"
            >
              <Cart1 size={16} />
              {count > 0 && (
                <span className={styles.cartBadge} aria-hidden="true">
                  {count}
                </span>
              )}
            </button>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Закрити меню"
              data-testid="mobile-menu-close"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 6H20M2 11H20M2 16H20"
                  stroke="#2C2C27"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.inner}>
          {/* Search */}
          <form className={styles.searchWrap} onSubmit={handleSearchSubmit} role="search">
            <span className={styles.searchIcon} aria-hidden="true">
              <Search1 size={20} />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Пошук…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="mobile-menu-search-input"
              aria-label="Пошук по сайту"
            />
          </form>

          {/* Vertical nav */}
          <nav className={styles.nav} aria-label="Основне меню">
            {NAV_ITEMS.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={styles.navItem}
                onClick={onClose}
                data-testid={it.testId}
              >
                {it.label}
              </Link>
            ))}
          </nav>

          {/* Contacts block */}
          <div className={styles.contacts}>
            <a href="tel:+380509375657" className={styles.contactLine}>
              050 937 56 57
            </a>
            <a href="tel:+380675101307" className={styles.contactLine}>
              067 510 13 07
            </a>
            <a href="mailto:tamisagro@gmail.com" className={styles.contactLine}>
              tamisagro@gmail.com
            </a>
          </div>

          {/* CTA */}
          <button
            type="button"
            className={styles.cta}
            onClick={handleCallback}
            data-testid="mobile-menu-cta-callback"
          >
            <span>Замовити дзвінок</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 10H16M16 10L10 4M16 10L10 16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </Portal>
  );
};

/* ─── Portal helper: render drawer into <body> so it isn't trapped by
   any ancestor's `backdrop-filter` (which would create a containing
   block for `position: fixed`, breaking full-screen layout). */
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted || typeof document === "undefined") return null;
  return ReactDOM.createPortal(children, document.body);
};

export default MobileMenu;
