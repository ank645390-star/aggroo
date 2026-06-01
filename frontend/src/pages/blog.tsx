import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Seo from "../components/Seo";
import Navbar1 from "../components/figma/navbar1";
import Footer1 from "../components/figma/footer1";
import BlogCard, { type BlogCardData } from "../components/blog/BlogCard";
import {
  listPosts,
  listCategories,
  listTags,
  type BlogPost,
  type BlogCategory,
  type BlogTag,
} from "../lib/blog-api";
import styles from "./blog.module.css";

/* =====================================================================
   /blog — Список статей. Дані з апі + фільтри (категорія, тег, пошук),
   сортування, hot-бейджі. URL-state в ?category=…&tag=…&q=…&sort=….
   ===================================================================== */

function toCardData(p: BlogPost): BlogCardData {
  return {
    id: p.id,
    slug: p.slug,
    image: p.cover_image || "/Image-Container@2x.webp",
    category: p.category || "Агрономія",
    date: formatDate(p.published_at) || "—",
    title: p.title,
    excerpt: p.excerpt,
    hot: !!p.hot,
    readingMinutes: p.reading_minutes,
  };
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const months = [
      "Січень", "Лютий", "Березень", "Квітень",
      "Травень", "Червень", "Липень", "Серпень",
      "Вересень", "Жовтень", "Листопад", "Грудень",
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || "";
  const tag = searchParams.get("tag") || "";
  const q = searchParams.get("q") || "";
  const sort = (searchParams.get("sort") || "newest") as "newest" | "oldest" | "popular";

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(q);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sortBoxRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLFormElement>(null);

  /* All-posts cache for live suggestions — kept independently of the
     filtered "posts" so the suggestion list works even when the user
     has narrowed by category/tag (we still want to suggest across
     ALL articles, like the global site search). */
  const [allPostsCache, setAllPostsCache] = useState<BlogPost[]>([]);

  const SORT_OPTIONS: Array<{ id: "newest" | "oldest" | "popular"; label: string }> = [
    { id: "newest", label: "Новіші" },
    { id: "oldest", label: "Старіші" },
    { id: "popular", label: "Популярні" },
  ];
  const activeSortLabel =
    SORT_OPTIONS.find((s) => s.id === sort)?.label ?? SORT_OPTIONS[0].label;

  /* Close sort menu + search suggestions on outside click + Escape */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sortBoxRef.current && !sortBoxRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSortOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Load static facets once (categories + tags) + all-posts cache for live
  // search suggestions (mirrors the global site search UX on /catalog).
  useEffect(() => {
    Promise.all([listCategories(), listTags()])
      .then(([cats, tgs]) => {
        setCategories(cats.items);
        setTags(tgs.items);
      })
      .catch(() => {});
    // Cache ALL posts (unfiltered) once — used to build instant
    // suggestion dropdown without re-hitting the API on every keystroke.
    // API caps limit at 100, which is more than enough for site-wide
    // suggestion search (and we keep it lazy in memory anyway).
    listPosts({ limit: 100, sort: "newest" })
      .then((res) => setAllPostsCache(res.items))
      .catch(() => {});
  }, []);

  // Load posts whenever filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listPosts({ category, tag, q, sort, limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setPosts(res.items);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.response?.data?.detail || "Не вдалося завантажити статті");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, tag, q, sort]);

  useEffect(() => setSearchInput(q), [q]);

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    setSearchParams(next, { replace: true });
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim() });
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = category || tag || q;

  /* =====================================================================
   * Live search suggestions (mirrors /catalog logic):
   *   • triggers from the 2nd character,
   *   • filters by title / excerpt / category / tags,
   *   • limited to 6 items,
   *   • clicking picks the article and navigates to /blog/:slug.
   * =====================================================================*/
  const suggestions = useMemo(() => {
    const needle = searchInput.trim().toLowerCase();
    if (needle.length < 2) return [];
    return allPostsCache
      .filter((p) => {
        const hay =
          `${p.title} ${p.excerpt} ${p.category || ""} ${(p.tags || []).join(" ")}`
            .toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, 6);
  }, [searchInput, allPostsCache]);

  const highlight = (text: string, needle: string): React.ReactNode => {
    if (!needle) return text;
    const idx = text.toLowerCase().indexOf(needle.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className={styles.suggestionMark}>
          {text.slice(idx, idx + needle.length)}
        </mark>
        {text.slice(idx + needle.length)}
      </>
    );
  };

  const handlePickSuggestion = (p: BlogPost) => {
    setSearchOpen(false);
    setSearchInput("");
    // Match global-search UX (catalog) — go straight to the article.
    navigate(`/blog/${p.slug}`);
  };

  // featuredPosts = first 2 posts (regular + wide). Rest in grid.
  const { featured, grid } = useMemo(() => {
    if (!posts.length) return { featured: [] as BlogPost[], grid: [] as BlogPost[] };
    return { featured: posts.slice(0, 2), grid: posts.slice(2) };
  }, [posts]);

  return (
    <div className={styles.page} data-testid="blog-page">
      <Seo
        title="Блог — TAMIS АГРО"
        description="Відкрийте майбутнє землеробства — експертні знання, реальні кейси та досвід провідних господарств."
        canonical="/blog"
        image="/Image-Container@2x.webp"
      />

      <Navbar1 device="Desktop" state="Default" size="20" size1="20" size2="16" />

      <main className={styles.main}>
        <div className={styles.inner}>
          {/* Breadcrumb */}
          <nav className={styles.breadcrumb} aria-label="breadcrumb" data-testid="blog-breadcrumb">
            <Link to="/" className={styles.breadcrumbLink}>Головна</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span className={styles.breadcrumbCurrent}>Блог</span>
          </nav>

          {/* Hero */}
          <header className={styles.hero}>
            <h1 className={styles.title}>
              <span className={styles.titleBold}>Відкрийте майбутнє</span>{" "}
              <span className={styles.titleAccent}>землеробства.</span>
            </h1>
            <p className={styles.lead}>
              Від кліматично орієнтованих рішень до передових агротехнологій. У нашому
              блозі — експертні знання, реальні кейси та досвід передових господарств.
            </p>
          </header>

          {/* Filters bar */}
          <section className={styles.filters} data-testid="blog-filters">
            <form
              ref={searchBoxRef}
              className={styles.searchBox}
              onSubmit={onSearchSubmit}
              role="search"
              data-open={searchOpen && searchInput.trim().length >= 2 ? "true" : "false"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="#5e5e57" strokeWidth="1.8" />
                <path d="m20 20-3.5-3.5" stroke="#5e5e57" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className={styles.searchInput}
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Пошук статті за назвою або змістом…"
                data-testid="blog-search-input"
                autoComplete="off"
                spellCheck={false}
              />
              {searchInput && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={() => { setSearchInput(""); setSearchOpen(false); updateParams({ q: "" }); }}
                  aria-label="Очистити пошук"
                  data-testid="blog-search-clear"
                >
                  ×
                </button>
              )}

              {/* Suggestions dropdown — mirrors /catalog global search UX */}
              {searchOpen && searchInput.trim().length >= 2 && (
                <div
                  className={styles.suggestions}
                  role="listbox"
                  data-testid="blog-search-suggestions"
                >
                  {suggestions.length === 0 ? (
                    <div className={styles.suggestionEmpty}>Нічого не знайдено</div>
                  ) : (
                    suggestions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={styles.suggestionItem}
                        onClick={() => handlePickSuggestion(p)}
                        data-testid={`blog-suggest-${p.id}`}
                      >
                        <img
                          loading="lazy"
                          decoding="async"
                          src={p.cover_image || "/Image-Container@2x.webp"}
                          alt=""
                          width={44}
                          height={44}
                        />
                        <div className={styles.suggestionText}>
                          <div className={styles.suggestionName}>
                            {highlight(p.title, searchInput.trim())}
                          </div>
                          <div className={styles.suggestionDesc}>
                            {p.category ? `${p.category} · ` : ""}
                            {highlight(p.excerpt || "", searchInput.trim())}
                          </div>
                        </div>
                        {p.reading_minutes ? (
                          <div className={styles.suggestionMeta}>
                            {p.reading_minutes} хв
                          </div>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              )}
            </form>

            <div className={styles.sortBox} ref={sortBoxRef}>
              <label className={styles.sortLabel}>Сортування:</label>
              <button
                type="button"
                className={styles.sortBtn}
                onClick={() => setSortOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                data-testid="blog-sort-toggle"
              >
                <span className={styles.sortValue}>{activeSortLabel}</span>
                <svg
                  className={styles.sortChevron}
                  width="12"
                  height="8"
                  viewBox="0 0 12 8"
                  fill="none"
                  aria-hidden="true"
                  style={{ transform: sortOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  <path
                    d="M1 1.5L6 6.5L11 1.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {sortOpen && (
                <div className={styles.sortMenu} role="listbox" data-testid="blog-sort-menu">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="option"
                      aria-selected={sort === opt.id}
                      className={`${styles.sortOption} ${sort === opt.id ? styles.sortOptionActive : ""}`}
                      onClick={() => {
                        updateParams({ sort: opt.id });
                        setSortOpen(false);
                      }}
                      data-testid={`blog-sort-${opt.id}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Categories chips */}
          {categories.length > 0 && (
            <div className={styles.chips} role="tablist" aria-label="Категорії">
              <button
                type="button"
                className={`${styles.chip} ${!category ? styles.chipActive : ""}`}
                onClick={() => updateParams({ category: "" })}
                data-testid="blog-chip-all"
              >
                Всі статті
              </button>
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`${styles.chip} ${category === c.name ? styles.chipActive : ""}`}
                  onClick={() => updateParams({ category: category === c.name ? "" : c.name })}
                  data-testid={`blog-chip-${c.name}`}
                >
                  {c.name} <span className={styles.chipCount}>{c.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Active tag indicator */}
          {tag && (
            <div className={styles.activeTag}>
              <span>Тег: <strong>#{tag}</strong></span>
              <button
                type="button"
                className={styles.removeTagBtn}
                onClick={() => updateParams({ tag: "" })}
              >
                Скинути ×
              </button>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={resetFilters}
              data-testid="blog-reset-filters"
            >
              Скинути всі фільтри
            </button>
          )}

          {/* Results */}
          {loading ? (
            <div className={styles.empty}>Завантаження…</div>
          ) : error ? (
            <div className={styles.empty} style={{ color: "#c14a3c" }}>{error}</div>
          ) : posts.length === 0 ? (
            <div className={styles.empty}>
              <p style={{ fontSize: 22, margin: 0, color: "#1b4332" }}>Статей не знайдено</p>
              <p style={{ marginTop: 8, color: "#5e5e57" }}>Спробуйте змінити фільтри або запит пошуку.</p>
            </div>
          ) : (
            <>
              {/* Featured row (regular + wide) — only when no active filters */}
              {!hasActiveFilters && featured.length === 2 && (
                <section className={styles.featuredRow} data-testid="blog-featured">
                  <BlogCard post={toCardData(featured[0])} variant="regular" />
                  <BlogCard post={toCardData(featured[1])} variant="wide" />
                </section>
              )}

              {/* Grid (rest) */}
              <section className={styles.grid} data-testid="blog-grid">
                {(hasActiveFilters ? posts : grid).map((p) => (
                  <BlogCard key={p.id} post={toCardData(p)} variant="regular" />
                ))}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer1 device="Desktop" />
    </div>
  );
};

export default Blog;
