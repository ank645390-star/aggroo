import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import HeaderSearch from "./header-search";
import User1 from "./user1";
import Cart1 from "./cart1";
import PrimaryButton1 from "./primary-button1";
import MobileMenu from "./mobile-menu";
import { useCart } from "../../context/CartContext";
import { useUserDrawer } from "../../context/UserDrawerContext";
import { useCallbackModal } from "../../context/CallbackContext";
import { useAuth } from "../../context/AuthContext";
import { useAuthModal } from "../../context/AuthModalContext";
import styles from "./navbar1.module.css";

/* =================================================================
   Navbar1
     • Desktop: search · user · cart · "Замовити дзвінок" CTA
     • Mobile : user · cart · burger → opens MobileMenu drawer
   ================================================================= */

export type Navbar1Type = {
  className?: string;
  size?: any;
  size1?: any;
  size2?: any;

  /** Variant props */
  device?: any;
  state?: any;
};

const Navbar1: React.FC<Navbar1Type> = ({
  className = "",
  device = "Desktop",
  state = "Default",
  size = 20,
}) => {
  const { count, openCart } = useCart();
  const { openUserDrawer } = useUserDrawer();
  const { openModal: openCallback } = useCallbackModal();
  const { isAuthed, user } = useAuth();
  const { openAuth } = useAuthModal();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { pathname } = useLocation();
  // Helper: build classNames for a nav link with hover-underline + active state
  const navLinkCls = (path: string, base: string) => {
    const isActive =
      pathname === path ||
      (path !== "/" && pathname.startsWith(path + "/")) ||
      (path === "/about" && pathname === "/o-nas") ||
      (path === "/cultures" && pathname === "/kultury");
    return [styles.navLink, base, isActive ? styles.navLinkActive : ""]
      .filter(Boolean)
      .join(" ");
  };

  const handleUserClick = () => {
    if (isAuthed) openUserDrawer();
    else openAuth("login");
  };

  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);

  return (
    <header
      className={[styles.navbar, className].join(" ")}
      data-device={device}
      data-state={state}
      data-mobile-open={mobileMenuOpen ? "true" : "false"}
    >
      <div className={styles.mainContent}>
        <div className={styles.leftContant}>
          <Link
            to="/"
            aria-label="На головну"
            style={{ display: "inline-flex", textDecoration: "none" }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              decoding="async"
              className={styles.logoIcon}
              loading="lazy"
              width={116}
              height={82}
              alt="Торговий дім ТАМІС АГРО"
              src="/logo@2x.png"
              style={{ cursor: "pointer" }}
            />
          </Link>
        </div>
        {/* Desktop nav links — hidden on mobile via CSS */}
        <nav className={styles.link}>
          <Link
            to="/catalog"
            className={navLinkCls("/catalog", styles.div)}
            data-testid="navbar-catalog-link"
          >
            Каталог
          </Link>
          <Link
            to="/cultures"
            className={navLinkCls("/cultures", styles.div2)}
            data-testid="navbar-cultures-link"
          >
            Культури
          </Link>
          <Link
            to="/about"
            className={navLinkCls("/about", styles.div3)}
            data-testid="navbar-about-link"
          >
            Про нас
          </Link>
          <Link
            to="/contacts"
            className={navLinkCls("/contacts", styles.div4)}
            data-testid="navbar-contacts-link"
          >
            Контакти
          </Link>
        </nav>
        <div className={styles.rightContent}>
          <div className={styles.iconButton}>
            {/* Header search (desktop only, hidden on mobile via CSS) */}
            <div className={styles.searchSlot}>
              <HeaderSearch size={size} />
            </div>

            {/* User icon — opens auth modal (guest) or side drawer (authed).
               When the user IS authenticated the button switches to a "filled"
               green variant с їхнім ініціалом (як в Gmail). Це візуально
               сигналізує, що вхід виконано, ще до відкриття дровера. */}
            <button
              type="button"
              className={[
                styles.iconButtons2,
                isAuthed ? styles.iconButtonAuthed : "",
              ].filter(Boolean).join(" ")}
              onClick={handleUserClick}
              aria-label={isAuthed ? "Особистий кабінет" : "Увійти до акаунту"}
              data-testid="navbar-user-trigger"
              data-authed={isAuthed ? "true" : "false"}
              title={isAuthed && user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : undefined}
            >
              {isAuthed ? (
                <>
                  <span className={styles.userInitial} aria-hidden="true">
                    {((user?.firstName?.[0] || user?.email?.[0] || "U") + "").toUpperCase()}
                  </span>
                  <span className={styles.authedDot} aria-hidden="true">
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 5.2 4 7.2 8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </>
              ) : (
                <User1 size={16} />
              )}
            </button>

            {/* Cart icon */}
            <button
              type="button"
              className={styles.iconButtons3}
              onClick={openCart}
              aria-label="Відкрити кошик"
              data-testid="navbar-cart-trigger"
            >
              <Cart1 size={16} />
              {count > 0 && (
                <span className={styles.cartBadge} data-testid="navbar-cart-count">
                  {count}
                </span>
              )}
            </button>

            {/* Burger — mobile only */}
            <button
              type="button"
              className={styles.burgerBtn}
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Закрити меню" : "Відкрити меню"}
              aria-expanded={mobileMenuOpen}
              data-testid="navbar-burger-toggle"
            >
              {mobileMenuOpen ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 3L19 19M19 3L3 19"
                    stroke="#2C2C27"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
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
              )}
            </button>
          </div>
          {/* Desktop CTA, hidden on mobile */}
          <div className={styles.ctaSlot}>
            <PrimaryButton1
              state="Default"
              type="Filled"
              prop="Замовити дзвінок"
              showCall
              size="24"
              onClick={openCallback}
            />
          </div>
        </div>
      </div>

      {/* Mobile menu drawer (renders only on small viewports) */}
      <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </header>
  );
};

export default Navbar1;
