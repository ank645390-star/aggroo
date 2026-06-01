import { useEffect, useRef, useState } from "react";

/**
 * useInViewOnce — fire-once IntersectionObserver hook.
 *
 * Returns a tuple [ref, inView] where:
 *   • ref  — attach to the element you want to observe.
 *   • inView — flips from `false` to `true` the FIRST time the element
 *     intersects the viewport (above the configured threshold).  Will
 *     never flip back, so entrance animations only ever play once.
 *
 * If `IntersectionObserver` is unavailable (very old browser / SSR
 * during hydration), we conservatively flag the element as "in view"
 * immediately so the content stays accessible.
 */
export function useInViewOnce<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
): [React.MutableRefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
          break;
        }
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView];
}
