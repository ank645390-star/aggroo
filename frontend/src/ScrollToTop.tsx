import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Прокручує сторінку вгору при кожній зміні маршруту,
 * щоб користувач не лишався у середині наступної сторінки.
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
};

export default ScrollToTop;
