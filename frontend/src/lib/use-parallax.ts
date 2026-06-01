import { useEffect, useRef } from "react";

/**
 * useParallax — gentle scroll-based parallax.
 *
 * Returns a ref to attach to the wrapper element. As the element moves through
 * the viewport, its `--parallax-y` CSS variable updates from `+strength` (when
 * just entering from below) down to `-strength` (when leaving the top).
 *
 *   <div ref={ref} style={{ transform: "translate3d(0, var(--parallax-y, 0px), 0)" }} />
 *
 * - `strength` — maximum absolute translation in px (default 48).
 * - Respects `prefers-reduced-motion`.
 * - Uses a single rAF tick, throttled to scroll/resize events.
 */
export function useParallax<T extends HTMLElement>(strength: number = 48) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.style.setProperty("--parallax-y", "0px");
      return;
    }

    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // progress: 1 when section just entered from below, 0 at center, -1 when leaving top.
      const center = rect.top + rect.height / 2;
      const distFromCenter = center - vh / 2;
      const range = (vh + rect.height) / 2;
      const progress = Math.max(-1, Math.min(1, distFromCenter / range));
      const y = progress * strength;
      el.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [strength]);

  return ref;
}
