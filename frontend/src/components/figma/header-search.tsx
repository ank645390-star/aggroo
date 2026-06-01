import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Search1 from "./search1";
import { listProducts, searchProductsLive, pickProductCover, type Product } from "../../lib/products-api";
import styles from "./header-search.module.css";

/* =================================================================
   Header search button + expanding panel with live suggestions.

   • Idle state  : round icon button (same as the rest of header chips)
   • Active state: button expands into a 480px-wide search field below
                   the navbar with a dropdown of up to 6 matches from
                   the 2-nd character.
   ================================================================= */

type Props = { size?: number };

const HeaderSearch: React.FC<Props> = ({ size = 20 }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ESC + outside click → close */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* Focus input when opening */
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);

  /* Load featured top-rated products once when the panel opens */
  useEffect(() => {
    if (!open || featured.length > 0) return;
    listProducts({ sort: "rec", limit: 4 })
      .then((r) => setFeatured(r.items))
      .catch(() => { /* silent */ });
  }, [open, featured.length]);

  /* Live suggestions when query changes (debounced via search endpoint) */
  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const t = window.setTimeout(() => {
      searchProductsLive(q, 6)
        .then((r) => { if (!cancelled) setSuggestions(r.items); })
        .catch(() => { if (!cancelled) setSuggestions([]); });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [query]);

  const goToCatalogWithQuery = useCallback(
    (q?: string) => {
      const value = (q ?? query).trim();
      const params = value ? `?q=${encodeURIComponent(value)}` : "";
      navigate(`/catalog${params}`);
      setOpen(false);
      setQuery("");
    },
    [navigate, query]
  );

  const handlePick = useCallback(
    (p: Product) => {
      navigate(`/product/${encodeURIComponent(p.slug)}`);
      setOpen(false);
      setQuery("");
    },
    [navigate]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToCatalogWithQuery();
  };

  /* highlight matched substring inside suggestion labels */
  const highlight = (text: string, q: string): React.ReactNode => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className={styles.mark}>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapRef} className={styles.wrap} data-open={open ? "true" : "false"}>
      <button
        type="button"
        className={styles.iconBtn}
        aria-label={open ? "Закрити пошук" : "Пошук"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="header-search-toggle"
      >
        {open ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1L13 13M13 1L1 13" stroke="#2C2C27" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ) : (
          <Search1 size={size} />
        )}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Пошук по сайту">
          <form className={styles.form} onSubmit={onSubmit}>
            <span className={styles.searchIcon} aria-hidden="true">
              <Search1 size={18} />
            </span>
            <input
              ref={inputRef}
              type="text"
              className={styles.input}
              placeholder="Знайти товар у каталозі…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="header-search-input"
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setQuery("")}
                aria-label="Очистити пошук"
                data-testid="header-search-clear"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className={styles.submitBtn}
              aria-label="Шукати"
              data-testid="header-search-submit"
            >
              Знайти
            </button>
          </form>

          {/* Body: live suggestions OR featured tiles when empty */}
          {query.trim().length >= 2 ? (
            <div className={styles.results} data-testid="header-search-results">
              {suggestions.length === 0 ? (
                <div className={styles.empty}>
                  За запитом «{query.trim()}» нічого не знайдено
                </div>
              ) : (
                <>
                  <div className={styles.sectionLabel}>Знайдені товари</div>
                  {suggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={styles.item}
                      onClick={() => handlePick(p)}
                      data-testid={`header-search-suggest-${p.id}`}
                    >
                      <img loading="lazy" decoding="async" src={pickProductCover(p)} alt="" width={48} height={48} />
                      <div className={styles.text}>
                        <div className={styles.name}>{highlight(p.name, query.trim())}</div>
                        <div className={styles.desc}>{highlight(p.short_desc, query.trim())}</div>
                      </div>
                      <div className={styles.price}>від {p.price} ₴/л</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.seeAll}
                    onClick={() => goToCatalogWithQuery()}
                    data-testid="header-search-see-all"
                  >
                    Дивитись усі результати у каталозі →
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.featured} data-testid="header-search-featured">
              <div className={styles.sectionLabel}>Популярні товари</div>
              <div className={styles.featuredGrid}>
                {featured.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.featuredTile}
                    onClick={() => handlePick(p)}
                  >
                    <img loading="lazy" decoding="async" src={pickProductCover(p)} alt={p.name} width={56} height={56} />
                    <div className={styles.featuredText}>
                      <div className={styles.name}>{p.name}</div>
                      <div className={styles.featuredPrice}>від {p.price} ₴/л</div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.seeAll}
                onClick={() => goToCatalogWithQuery()}
              >
                Перейти до каталогу →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderSearch;
