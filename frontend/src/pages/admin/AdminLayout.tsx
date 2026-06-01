import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminLayout.module.css";

/* =====================================================================
   AdminLayout — сайдбар-меню з collapsible-групами, реальним логотипом
   TAMIS АГРО та топбаром. Якщо користувач не авторизований або не admin —
   показуємо форму входу.

   Аудит (травень 2026):
     • Реальний логотип TAMIS АГРО замість квадратного "TA" placeholder
     • Видалено дублюючий пункт "Платежі" → /admin/sales (= "Огляд продажів")
     • Видалено застарілу заглушку "Контент" → /admin/content
     • Групи sidebar тепер collapsible (стан зберігається у localStorage)
     • Більш чітка ієрархія: Каталог винесено в окрему групу
   ===================================================================== */

/* ---------- Icons (compact inline SVG) ---------- */
const IconDashboard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6"/><rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/></svg>;
const IconPhone = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21.97 18.33a2.5 2.5 0 0 1-2.5 2.5C9.95 20.83 3.17 14.05 3.17 4.53a2.5 2.5 0 0 1 2.5-2.5h2.5a1 1 0 0 1 1 .79l.95 4.27a1 1 0 0 1-.27.93l-1.7 1.7a14.5 14.5 0 0 0 6.13 6.13l1.7-1.7a1 1 0 0 1 .93-.27l4.27.95a1 1 0 0 1 .79 1v2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const IconBell = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IconCard = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.5" width="19" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6"/></svg>;
const IconDoc = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M14 3H6a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5V9.5L14 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v6h5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const IconBox = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3.5 7L12 3l8.5 4v10L12 21 3.5 17V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3.5 7L12 11l8.5-4M12 11v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const IconFaq = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-.9.5-1.5 1.2-1.5 2v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="12" cy="17" r="0.9" fill="currentColor"/></svg>;
const IconContact = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 8l9 6 9-6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const IconBlog = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M16 4v3h3M8 11h8M8 15h8M8 7h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><circle cx="17" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M15.5 14.5c2.7.2 5.5 1.5 6 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IconChart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 14l3-3 3 3 5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconCart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 3h3l2.5 13a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21.5 7H6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="20" r="1.4" fill="currentColor"/><circle cx="18" cy="20" r="1.4" fill="currentColor"/></svg>;
const IconTag = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2H3v9l11 11 9-9L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg>;
const IconLeaf = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 4c-7 0-13 4-13 11 0 3 1 5 3 6 0-7 4-11 10-12V4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 20s2-7 10-12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
const IconStar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
const IconHandshake = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 11l3-3 4 1 2-2 4 4-2 2-3-3M14 13l3 3a2 2 0 0 0 3-3l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 4V3a1.5 1.5 0 0 0-1.5-1.5h-8A1.5 1.5 0 0 0 3 3v18a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 14 21v-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M9 12h12m0 0l-3.5-3.5M21 12l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconExternal = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 4h6v6M20 4l-9 9M10 6H5.5A1.5 1.5 0 0 0 4 7.5v11A1.5 1.5 0 0 0 5.5 20h11A1.5 1.5 0 0 0 18 18.5V14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconChevron = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IconArrowLeft = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* ---------- Page titles map ---------- */
const pageTitles: Record<string, { title: string; sub?: string }> = {
  "/admin":               { title: "Дашборд",       sub: "Загальний огляд активності TAMIS АГРО" },
  "/admin/sales":         { title: "Продажі — огляд", sub: "Виторг, оплати, конверсія, абандонені кошики" },
  "/admin/sales/orders":  { title: "Замовлення (CRM)", sub: "Реєстр замовлень, фільтр за оплатою/статусом, контактні дані" },
  "/admin/sales/abandoned-carts": { title: "Покинуті кошики", sub: "Контакти клієнтів, що не довели до оплати" },
  "/admin/sales/users":   { title: "Користувачі",   sub: "Зареєстровані клієнти, LTV та замовлення" },
  "/admin/sales/upsells": { title: "Допродажі",     sub: "Правила «купив A — пропонуй B»" },
  "/admin/discounts":     { title: "Знижки",         sub: "Гнучкі правила знижок (за обʼємом, кількістю, сумою кошика чи категорією)" },
  "/admin/callbacks":     { title: "Заявки на дзвінок", sub: "Обробка вхідних заявок від клієнтів" },
  "/admin/notifications": { title: "Налаштування сповіщень", sub: "Канали для отримання заявок (Telegram / Email)" },
  "/admin/faq":           { title: "Часті запитання",  sub: "Управління FAQ на сторінці Контакти" },
  "/admin/cultures":      { title: "Культури",         sub: "Картки секції «Знайдіть рішення для вашої культури»" },
  "/admin/inside-tabs":   { title: "Зазирни всередину", sub: "Пункти секції «Зазирни всередину» (Bacillus, Trichoderma тощо)" },
  "/admin/partners":      { title: "Партнери / Нам довіряють", sub: "Логотипи на сторінках Головна та Про нас" },
  "/admin/blog":          { title: "Блог",            sub: "Управління статтями блогу — створення, редагування, публікація" },
  "/admin/blog/new":      { title: "Нова стаття",     sub: "Створення нової статті блогу" },
  "/admin/reviews":       { title: "Відгуки",         sub: "Відгуки клієнтів («Фермери обирають нас»). Текст, фото, рейтинг, прив'язка до товару." },
  "/admin/contact-info":  { title: "Контактна інформація", sub: "Телефони, email, режим роботи, адреси у футері й Контактах" },
  "/admin/products":      { title: "Товари",         sub: "Картки товарів та їх наповнення" },
  "/admin/products/new":  { title: "Новий товар",    sub: "Створення нової картки товару" },
  "/admin/product-categories": { title: "Категорії товарів", sub: "Налаштування фільтру каталогу" },
  "/admin/policies":      { title: "Політики (Cookie / Privacy / Terms)", sub: "Тексти юридичних блоків, що відображаються у футері та чекбоксах" },
};

/* ---------- Nav-group definition ---------- */
type NavItem = { to: string; label: string; icon: React.ReactNode; testId?: string; end?: boolean };
type NavGroup = { id: string; title: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    title: "Огляд",
    items: [
      { to: "/admin", end: true, label: "Дашборд", icon: <IconDashboard />, testId: "admin-nav-dashboard" },
    ],
  },
  {
    id: "sales",
    title: "Продажі / CRM",
    items: [
      { to: "/admin/sales", end: true, label: "Огляд продажів", icon: <IconChart />, testId: "admin-nav-sales-dashboard" },
      { to: "/admin/sales/orders", label: "Замовлення / Оплати", icon: <IconCard />, testId: "admin-nav-orders" },
      { to: "/admin/sales/abandoned-carts", label: "Покинуті кошики", icon: <IconCart />, testId: "admin-nav-abandoned-carts" },
      { to: "/admin/sales/users", label: "Користувачі", icon: <IconUsers />, testId: "admin-nav-sales-users" },
      { to: "/admin/sales/upsells", label: "Допродажі", icon: <IconHandshake />, testId: "admin-nav-upsells" },
      { to: "/admin/discounts", label: "Знижки", icon: <IconTag />, testId: "admin-nav-discounts" },
    ],
  },
  {
    id: "clients",
    title: "Клієнти",
    items: [
      { to: "/admin/callbacks", label: "Заявки на дзвінок", icon: <IconPhone />, testId: "admin-nav-callbacks" },
    ],
  },
  {
    id: "catalog",
    title: "Каталог",
    items: [
      { to: "/admin/products", label: "Товари", icon: <IconBox />, testId: "admin-nav-products" },
      { to: "/admin/product-categories", label: "Категорії товарів", icon: <IconTag />, testId: "admin-nav-product-categories" },
    ],
  },
  {
    id: "content",
    title: "Контент сайту",
    items: [
      { to: "/admin/blog", label: "Блог", icon: <IconBlog />, testId: "admin-nav-blog" },
      { to: "/admin/reviews", label: "Відгуки", icon: <IconStar />, testId: "admin-nav-reviews" },
      { to: "/admin/cultures", label: "Культури", icon: <IconLeaf />, testId: "admin-nav-cultures" },
      { to: "/admin/inside-tabs", label: "Зазирни всередину", icon: <IconBox />, testId: "admin-nav-inside-tabs" },
      { to: "/admin/partners", label: "Нам довіряють", icon: <IconHandshake />, testId: "admin-nav-partners" },
      { to: "/admin/faq", label: "Часті запитання", icon: <IconFaq />, testId: "admin-nav-faq" },
      { to: "/admin/policies", label: "Політики (Cookie / Privacy)", icon: <IconDoc />, testId: "admin-nav-policies" },
    ],
  },
  {
    id: "settings",
    title: "Налаштування",
    items: [
      { to: "/admin/notifications", label: "Сповіщення (Telegram / Email)", icon: <IconBell />, testId: "admin-nav-notifications" },
      { to: "/admin/contact-info", label: "Контактна інформація", icon: <IconContact />, testId: "admin-nav-contact-info" },
    ],
  },
];

/* localStorage key для збереження стану розгортання груп. */
const COLLAPSE_KEY = "admin.sidebar.collapsed";

const AdminLayout: React.FC = () => {
  const { user, isAuthed, loading, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Стан мобільного off-canvas сайдбару. */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* Закриваємо мобільне меню при зміні маршруту. */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  /* Стан розгорнутих/згорнутих груп. Default — всі розгорнуті. */
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  /* Автоматично розкриваємо групу, у якій є активний пункт. */
  const activeGroupId = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.items.some(it =>
        it.end ? location.pathname === it.to : location.pathname.startsWith(it.to)
      )) return g.id;
    }
    return null;
  }, [location.pathname]);
  useEffect(() => {
    if (activeGroupId && collapsed[activeGroupId]) {
      setCollapsed(c => ({ ...c, [activeGroupId]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  const toggleGroup = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Невірний логін або пароль");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loginShell}>
        <div className={styles.loginCard}>
          <p style={{textAlign:"center", color:"#5e5e57", margin:0}}>Завантаження…</p>
        </div>
      </div>
    );
  }

  // Не авторизований або не admin — форма входу
  if (!isAuthed || user?.role !== "admin") {
    return (
      <div className={styles.loginShell}>
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>
            <img src="/logo@2x.png" alt="TAMIS АГРО" className={styles.loginLogo} />
            <span className={styles.loginBadge}>Admin Panel</span>
          </div>
          <h1 className={styles.loginTitle}>Вхід в адмінпанель</h1>
          <p className={styles.loginSub}>Введіть облікові дані адміністратора.</p>
          <form className={styles.loginForm} onSubmit={onSubmit}>
            <label className={styles.loginLabel}>
              Пошта
              <input
                className={styles.loginInput}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tamis.ua"
                autoFocus
                data-testid="admin-login-email"
                required
              />
            </label>
            <label className={styles.loginLabel}>
              Пароль
              <input
                className={styles.loginInput}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="admin-login-password"
                required
              />
            </label>
            {error && <div className={styles.loginError} data-testid="admin-login-error">{error}</div>}
            {isAuthed && user?.role !== "admin" && (
              <div className={styles.loginError}>
                Цей акаунт не має прав адміністратора. Увійдіть як admin.
              </div>
            )}
            <button type="submit" className={styles.loginSubmit} disabled={submitting} data-testid="admin-login-submit">
              {submitting ? "Вхід…" : "Увійти"}
            </button>
          </form>
          <div className={styles.loginHint}>
            Демо: <code>admin@tamis.ua</code> / <code>admin1234</code>
          </div>
          <Link to="/" className={styles.backLink}>← На головну</Link>
        </div>
      </div>
    );
  }

  const meta = pageTitles[location.pathname] || { title: "Адмін" };
  const initials = `${(user?.firstName?.[0] || "A").toUpperCase()}${(user?.lastName?.[0] || "").toUpperCase()}`;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className={styles.shell}>
      {/* Mobile burger button — only visible <768px */}
      <button
        type="button"
        className={styles.mobileBurger}
        onClick={() => setMobileNavOpen(true)}
        aria-label="Відкрити меню"
        data-testid="admin-mobile-burger"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {/* Mobile sidebar backdrop */}
      {mobileNavOpen && (
        <div
          className={styles.mobileBackdrop}
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarMobileOpen : ""}`} onClick={(e) => {
        // Close drawer when nav-link clicked on mobile
        const t = e.target as HTMLElement;
        if (window.innerWidth <= 768 && (t.closest('a') || t.closest('button[type="submit"]'))) {
          setMobileNavOpen(false);
        }
      }}>
        {/* ===== Brand: логотип займає всю шапку, з ненавʼязливим лейблом "ADMIN PANEL".
             Без дублювання текстової назви бренду (вона вже всередині логотипа). ===== */}
        <Link to="/admin" className={styles.brand} data-testid="admin-brand" aria-label="TAMIS АГРО — Admin Panel">
          <img src="/logo@2x.png" alt="TAMIS АГРО" className={styles.brandLogo} />
          <span className={styles.brandBadge}>Admin Panel</span>
        </Link>

        {/* ===== Collapsible nav groups ===== */}
        <div className={styles.navScroll}>
          {NAV_GROUPS.map(group => {
            const isCollapsed = !!collapsed[group.id];
            return (
              <div key={group.id} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navGroupTitle} ${isCollapsed ? styles.navGroupCollapsed : ""}`}
                  onClick={() => toggleGroup(group.id)}
                  data-testid={`admin-nav-group-${group.id}`}
                  aria-expanded={!isCollapsed}
                >
                  <span>{group.title}</span>
                  <span className={styles.navGroupChevron}><IconChevron /></span>
                </button>
                {!isCollapsed && (
                  <div className={styles.navGroupBody}>
                    {group.items.map(item => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
                        data-testid={item.testId}
                      >
                        <span className={styles.navIcon}>{item.icon}</span>
                        <span className={styles.navLabel}>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ===== Footer: user card + logout ===== */}
        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userText}>
              <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
              <span className={styles.userEmail}>{user?.email}</span>
            </div>
          </div>
          <button type="button" className={styles.logout} onClick={handleLogout} data-testid="admin-logout">
            <IconLogout /> Вихід
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          {location.pathname !== "/admin" && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => {
                // Smart back: if history is available, go back; otherwise fallback to /admin
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/admin");
                }
              }}
              aria-label="Назад"
              data-testid="admin-back-button"
            >
              <IconArrowLeft />
              <span>Назад</span>
            </button>
          )}
          <div className={styles.topbarTitleBlock}>
            <h1 className={styles.topbarTitle}>{meta.title}</h1>
            {meta.sub && <p className={styles.topbarSub}>{meta.sub}</p>}
          </div>
          <div className={styles.topbarRight}>
            <Link to="/" className={styles.linkSite} target="_blank" rel="noreferrer">
              <IconExternal /> Відкрити сайт
            </Link>
          </div>
        </header>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
