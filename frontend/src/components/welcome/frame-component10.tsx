import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./frame-component10.module.css";
import { listPartnersPublic, type Partner } from "../../lib/trusted-partners-api";

export type FrameComponent10Type = {
  className?: string;
  title?: string;
  /**
   * Вирівнювання заголовка секції:
   *   - "center" — використовується на головній (/welcome) сторінці
   *   - "left"   — використовується на /about (за замовч.)
   */
  align?: "center" | "left";
};

/**
 * Section "Нам довіряють" — використовується на /welcome та /about.
 * Логотипи тягнуться з /api/trusted-partners (повністю керуються з адмінки).
 * Кожний логотип рендериться в єдиному контейнері (object-fit: contain),
 * щоб не ламався адаптив незалежно від оригінальних пропорцій лого.
 *
 * При скролі по входженню в в'юпорт логотипи з'являються послідовно
 * (staggered fade-in + slight rise) використовуючи IntersectionObserver.
 */
const FrameComponent10: React.FC<FrameComponent10Type> = ({
  className = "",
  title = "Нам довіряють",
  align = "left",
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listPartnersPublic();
        if (mounted) setPartners(list);
      } catch {
        if (mounted) setPartners([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // === Scroll-triggered staggered fade-in ===
  useEffect(() => {
    if (loading || partners.length === 0) return;
    const root = gridRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-partner-id]"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const id = (e.target as HTMLElement).dataset.partnerId;
              if (id) {
                setVisibleIds((prev) => {
                  if (prev.has(id)) return prev;
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                });
                io.unobserve(e.target);
              }
            }
          }
        },
        { rootMargin: "-10% 0px -10% 0px", threshold: 0.1 }
      );
      items.forEach((el) => io.observe(el));
      return () => io.disconnect();
    } else {
      // fallback: show all immediately
      setVisibleIds(new Set(partners.map((p) => p.id)));
    }
  }, [loading, partners]);

  // Memoize order map so stagger delay = index * step
  const orderIndex = useMemo(() => {
    const m = new Map<string, number>();
    partners.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [partners]);

  return (
    <section
      className={[styles.section, className].join(" ")}
      data-testid="trust-section"
    >
      {/* Mobile-only decorative grid pattern (per design 29.05.2026).
          Hidden on desktop via CSS (.gridBg @media). */}
      <div className={styles.gridBg} aria-hidden="true" />

      <h2
        className={`${styles.title} ${align === "center" ? styles.titleCenter : ""}`}
      >
        {title}
      </h2>

      <div
        className={styles.grid}
        ref={gridRef}
        data-testid="trust-grid"
        style={{
          /* dynamic column count for graceful adaptivity — 3 cols at >=1100px, 2 below, 1 mobile */
          gridTemplateColumns:
            partners.length <= 3
              ? `repeat(${partners.length}, 1fr)`
              : "repeat(3, 1fr)",
        }}
      >
        {loading ? (
          <div className={styles.emptyState}>Завантаження…</div>
        ) : partners.length === 0 ? (
          <div className={styles.emptyState}>Логотипи поки не додано</div>
        ) : (
          partners.map((p) => {
            const idx = orderIndex.get(p.id) ?? 0;
            const isVisible = visibleIds.has(p.id);
            const delay = `${idx * 90}ms`;
            const cellInner = (
              <div className={styles.logoBox}>
                {p.logo_url ? (
                  <img decoding="async"
                    src={p.logo_url}
                    alt={p.alt || p.name}
                    loading="lazy"
                    className={styles.logoImg}
                    onError={(e) => {
                      /* If the logo file is missing, hide the broken image
                         icon and render the partner name as text fallback. */
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector("[data-fallback-text]")) {
                        const span = document.createElement("span");
                        span.setAttribute("data-fallback-text", "true");
                        span.className = styles.fallback;
                        span.textContent = p.name;
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className={styles.fallback}>{p.name}</span>
                )}
              </div>
            );
            return (
              <div
                key={p.id}
                data-partner-id={p.id}
                data-testid={`trust-cell-${idx}`}
                className={`${styles.cell} ${isVisible ? styles.cellVisible : ""}`}
                style={{ transitionDelay: isVisible ? delay : "0ms" }}
              >
                {p.link_url ? (
                  <a
                    href={p.link_url}
                    className={styles.cellLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={p.name}
                  >
                    {cellInner}
                  </a>
                ) : (
                  cellInner
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default FrameComponent10;
