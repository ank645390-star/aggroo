import React, { Suspense, lazy, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./figma-global.css";
import "./welcome-global.css";

import ScrollToTop from "./ScrollToTop";
import { CartProvider } from "./context/CartContext";
import { UserDrawerProvider } from "./context/UserDrawerContext";
import { AuthProvider } from "./context/AuthContext";
import { AuthModalProvider } from "./context/AuthModalContext";
import { CallbackProvider } from "./context/CallbackContext";
import { EmailModalProvider } from "./context/EmailModalContext";
import { ContactInfoProvider } from "./context/ContactInfoContext";
import { PolicyProvider } from "./context/PolicyContext";
import CartDrawer from "./components/cart/CartDrawer";
import UserDrawer from "./components/user/UserDrawer";
import CallbackModal from "./components/callback/CallbackModal";
import EmailModal from "./components/email/EmailModal";
import GlobalAuthModal from "./components/auth/GlobalAuthModal";
import PolicyModal from "./components/policies/PolicyModal";
import CookieBanner from "./components/policies/CookieBanner";

/* ====================================================================
 * Code-splitting: route-level lazy loading. Кожна сторінка тягнеться
 * окремим chunk-ом, що значно прискорює initial load.
 * ==================================================================== */
const Welcome = lazy(() => import("./pages/welcome"));
const Catalog = lazy(() => import("./pages/catalog"));
const Desktop1 = lazy(() => import("./pages/desktop1"));
const Checkout = lazy(() => import("./pages/checkout"));
const Profile = lazy(() => import("./pages/profile"));
const ProfileAddresses = lazy(() => import("./pages/profile-addresses"));
const ProfileOrders = lazy(() => import("./pages/profile-orders"));
const Contacts = lazy(() => import("./pages/contacts"));
const About = lazy(() => import("./pages/about"));
const Cultures = lazy(() => import("./pages/cultures"));
const Blog = lazy(() => import("./pages/blog"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminCallbacks = lazy(() => import("./pages/admin/AdminCallbacks"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));
const AdminFaq = lazy(() => import("./pages/admin/AdminFaq"));
const AdminContactInfo = lazy(() => import("./pages/admin/AdminContactInfo"));
const AdminCultures = lazy(() => import("./pages/admin/AdminCultures"));
const AdminInsideTabs = lazy(() => import("./pages/admin/AdminInsideTabs"));
const AdminPartners = lazy(() => import("./pages/admin/AdminPartners"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminBlogEdit = lazy(() => import("./pages/admin/AdminBlogEdit"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductEdit = lazy(() => import("./pages/admin/AdminProductEdit"));
const AdminProductCategories = lazy(() => import("./pages/admin/AdminProductCategories"));
const AdminPolicies = lazy(() => import("./pages/admin/AdminPolicies"));
const AdminSalesDashboard = lazy(() => import("./pages/admin/AdminSalesDashboard"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/AdminOrderDetail"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUpsells = lazy(() => import("./pages/admin/AdminUpsells"));
const AdminDiscounts = lazy(() => import("./pages/admin/AdminDiscounts"));
const BlogPostPage = lazy(() => import("./pages/blog-post"));

const DESIGN_WIDTH = 1920;
/** Below this viewport width we DON'T scale — components render in
 *  their native mobile layout via @media (max-width: 768px) rules. */
const MOBILE_BREAKPOINT = 768;
/** Below this width we still scale-DOWN against `effective` (clamped to
 *  MIN_DESKTOP_WIDTH) so very narrow tablet widths don't shrink the
 *  design beyond usable. */
const MIN_DESKTOP_WIDTH = 1024;
/** Hard upper cap so QHD/4K/5K/ultrawide monitors keep the layout at
 *  its intended 1920px design proportions (centred with side gutters)
 *  instead of stretching absolute-positioned elements apart. */
const MAX_SCALE = 1;

/**
 * AdminAreaWrapper — для /admin* НЕ застосовуємо scale-обгортку,
 * адмінка має нативний адаптивний layout.
 *
 * ScaledShell:
 * - viewport < 768 → mobile native layout (no scale wrapper)
 * - 768 ≤ viewport ≤ 1920 → uniform fluid scale = vw / 1920
 *   (with min-clamp at 1024 so tiny tablet widths don't over-shrink)
 * - viewport > 1920 → scale capped at 1.0; layout stays at its intended
 *   1920px proportions, centred with side gutters. This preserves the
 *   designed relative spacing of absolutely-positioned elements (e.g.
 *   "+20 РОКІВ" ↔ "МИ СТВОРЮЄМО") on QHD/4K/5K/ultrawide displays.
 * - Hardened for Safari/iOS: uses both `transform` and `-webkit-transform`
 *   via a CSS class so Safari < 14 / older WebKit still renders correctly.
 */
const ScaledShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [outerHeight, setOuterHeight] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );

  useLayoutEffect(() => {
    if (isAdmin) return;
    const compute = () => {
      // CRITICAL: use window.innerWidth (NOT documentElement.clientWidth)
      // because the inner shell has width:1920px which can expand the
      // document width before overflow:hidden kicks in. innerWidth is
      // the actual viewport size regardless of content overflow.
      const vw = window.innerWidth || DESIGN_WIDTH;
      const mobile = vw < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        // Native mobile: no scaling, no fixed design-width inner box.
        setScale(1);
        setOuterHeight(0);
        if (typeof document !== "undefined") {
          document.documentElement.style.setProperty("--app-scale", "1");
        }
        return;
      }
      // Fluid scaling: design canvas 1920px → viewport.
      //   - Clamp `effective` to ≥ MIN_DESKTOP_WIDTH so very narrow
      //     tablet widths don't shrink the design beyond usable.
      //   - Clamp scale to ≤ MAX_SCALE (=1) so QHD/4K/5K/ultrawide
      //     monitors keep the 1920px layout proportions instead of
      //     stretching absolute-positioned elements apart.
      const effective = Math.max(vw, MIN_DESKTOP_WIDTH);
      let s = effective / DESIGN_WIDTH;
      if (s > MAX_SCALE) s = MAX_SCALE;
      const inner = innerRef.current;
      const realH = inner ? inner.offsetHeight : 0;
      setScale(s);
      setOuterHeight(realH * s);
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--app-scale", String(s));
        document.documentElement.style.setProperty(
          "--app-design-width",
          `${DESIGN_WIDTH}px`,
        );
      }
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    let ro: ResizeObserver | undefined;
    if (innerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => compute());
      ro.observe(innerRef.current);
    }
    const onLoad = () => compute();
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
      window.removeEventListener("load", onLoad);
      ro?.disconnect();
    };
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  // Mobile (< 768px): render children directly, with NO transform-scale
  // wrapper and NO fixed 1920px inner box.  This lets every component's
  // @media (max-width: 768px) rules paint the native mobile layout.
  // IMPORTANT: do NOT set overflow:hidden here — it kills
  // `position: sticky` for any descendant (sticky-scroll sections rely on
  // an unconstrained scroll context up to the document). Horizontal
  // overflow is already guarded at <body> / <html> level.
  if (isMobile) {
    return (
      <div
        className="scaledShell-mobile"
        style={{ width: "100%", maxWidth: "100vw" }}
      >
        {children}
      </div>
    );
  }

  // Build transform inline-style with vendor prefix for Safari compat.
  // (React inline styles don't add prefixes automatically.)
  const transformValue = `scale(${scale})`;
  // When scale is capped at 1 (viewport > 1920px), the inner 1920px
  // canvas is centred with side gutters via `margin: 0 auto`. For
  // scale<1 (tablet widths) origin remains top-left so the scaled
  // content aligns to the left edge of the viewport.
  const innerMargin = scale >= 1 ? "0 auto" : "0";
  const innerTransformOrigin = scale >= 1 ? "top center" : "top left";

  return (
    <div
      className="scaledShell-outer"
      style={{
        width: "100%",
        maxWidth: "100vw",
        height: outerHeight ? `${outerHeight}px` : "auto",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={innerRef}
        className="scaledShell-inner"
        style={{
          width: `${DESIGN_WIDTH}px`,
          margin: innerMargin,
          transformOrigin: innerTransformOrigin,
          WebkitTransformOrigin: innerTransformOrigin,
          transform: transformValue,
          WebkitTransform: transformValue,
          willChange: "transform",
          // Safari rendering hint to avoid blurry text on scaled content
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Мінімалістичний loader-екран для Suspense fallback */
const RouteFallback: React.FC = () => (
  <div
    aria-busy="true"
    aria-label="Завантаження..."
    style={{
      minHeight: "60vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f5f5f0",
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: "3px solid rgba(27,67,50,0.15)",
        borderTopColor: "#1b4332",
        animation: "tamis-spin 0.85s linear infinite",
      }}
    />
    <style>{`@keyframes tamis-spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AuthModalProvider>
            <CartProvider>
              <UserDrawerProvider>
                <CallbackProvider>
                  <EmailModalProvider>
                    <ContactInfoProvider>
                      <PolicyProvider>
                      <ScaledShell>
                      <ScrollToTop />
                      <Suspense fallback={<RouteFallback />}>
                        <Routes>
                          <Route path="/" element={<Welcome />} />
                          <Route path="/catalog" element={<Catalog />} />
                          <Route path="/product" element={<Desktop1 />} />
                          <Route path="/product/:slug" element={<Desktop1 />} />
                          <Route path="/products/:slug" element={<Desktop1 />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/profile/addresses" element={<ProfileAddresses />} />
                          <Route path="/profile/orders" element={<ProfileOrders />} />
                          <Route path="/contacts" element={<Contacts />} />
                          <Route path="/about" element={<About />} />
                          <Route path="/o-nas" element={<About />} />
                          <Route path="/cultures" element={<Cultures />} />
                          <Route path="/kultury" element={<Cultures />} />
                          <Route path="/blog" element={<Blog />} />
                          <Route path="/blog/:slug" element={<BlogPostPage />} />

                          {/* Admin routes — захищені AdminLayout-ом */}
                          <Route path="/admin" element={<AdminLayout />}>
                            <Route index element={<AdminDashboard />} />
                            <Route path="callbacks" element={<AdminCallbacks />} />
                            <Route path="notifications" element={<AdminNotifications />} />
                            <Route path="faq" element={<AdminFaq />} />
                            <Route path="contact-info" element={<AdminContactInfo />} />
                            <Route path="cultures" element={<AdminCultures />} />
                            <Route path="inside-tabs" element={<AdminInsideTabs />} />
                            <Route path="partners" element={<AdminPartners />} />
                            <Route path="blog" element={<AdminBlog />} />
                            <Route path="blog/new" element={<AdminBlogEdit />} />
                            <Route path="blog/:id/edit" element={<AdminBlogEdit />} />
                            <Route path="reviews" element={<AdminReviews />} />
                            <Route path="products" element={<AdminProducts />} />
                            <Route path="products/new" element={<AdminProductEdit />} />
                            <Route path="products/:id/edit" element={<AdminProductEdit />} />
                            <Route path="product-categories" element={<AdminProductCategories />} />
                            <Route path="policies" element={<AdminPolicies />} />
                            {/* Sales / CRM */}
                            <Route path="sales" element={<AdminSalesDashboard />} />
                            <Route path="sales/orders" element={<AdminOrders />} />
                            <Route path="sales/orders/:id" element={<AdminOrderDetail />} />
                            <Route path="sales/abandoned-carts" element={<AdminAbandonedCarts />} />
                            <Route path="sales/users" element={<AdminUsers />} />
                            <Route path="sales/upsells" element={<AdminUpsells />} />
                            <Route path="discounts" element={<AdminDiscounts />} />
                            <Route path="payments" element={<AdminSalesDashboard />} />
                            <Route path="content" element={<AdminPlaceholder title="Контент" />} />
                          </Route>

                          <Route path="*" element={<Welcome />} />
                        </Routes>
                      </Suspense>
                    </ScaledShell>

                    {/* Drawers + Modals rendered OUTSIDE scale wrapper */}
                    <CartDrawer />
                    <UserDrawer />
                    <CallbackModal />
                    <EmailModal />
                    <GlobalAuthModal />
                    <PolicyModal />
                    <CookieBanner />
                      </PolicyProvider>
                    </ContactInfoProvider>
                  </EmailModalProvider>
                </CallbackProvider>
              </UserDrawerProvider>
            </CartProvider>
          </AuthModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
};

export default App;
