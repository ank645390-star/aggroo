import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CardBlog1 from "./card-blog1";
import TiltCard from "./tilt-card";
import { useParallax } from "../../lib/use-parallax";
import { listPosts, type BlogPost } from "../../lib/blog-api";
import styles from "./blog-part1.module.css";

export type BlogPart1Type = {
  className?: string;
};

/* =====================================================================
   BlogPart1 — секція "Блог агронома" на головній. Тягне 3 останні
   опубліковані статті з /api/blog/posts і веде кожну картку на
   /blog/{slug}. Якщо немає посту в базі — фолбек на статичні плейсхолдери.

   Layout:
   - .blogPart        — full-width, padding 140px / 24px, items centered
   - .inner           — 1680px content lane (matches product carousel) +
                        scroll parallax via useParallax → --parallax-y
   - .cardsGroup      — 3-col grid, 24px gap, equal-height cards
   - <TiltCard>       — adds cursor-tracking 3D tilt to each card
   ===================================================================== */

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
    return "";
  }
}

const FALLBACK_ITEMS = [
  {
    slug: "",
    image: "/Image-Container@2x.webp",
    title: "Мінус 30% на селітрі",
    description:
      "Як інокулянти фіксують атмосферний азот і дозволяють економити на мінеральних добривах без втрати врожайності.",
    category: "Інокулянти",
    readingMinutes: 4,
    date: "",
  },
  {
    slug: "",
    image: "/Image-Container@2x.webp",
    title: "Біопрепарати: усе з початку",
    description:
      "Кліматично орієнтовані рішення для захисту врожаю: як біопрепарати роблять виробництво стійким.",
    category: "Біотехнології",
    readingMinutes: 3,
    date: "",
  },
  {
    slug: "",
    image: "/Image-Container@2x.webp",
    title: "Чому живі бактерії виграють у хімії",
    description:
      "На конкретних польових випробуваннях показуємо, чим біопрепарати перевершують класичну хімію.",
    category: "Агрономія",
    readingMinutes: 5,
    date: "",
  },
];

const BlogPart1: React.FC<BlogPart1Type> = ({ className = "" }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Scroll parallax for the section content (subtle vertical drift)
  const parallaxRef = useParallax<HTMLDivElement>(40);

  useEffect(() => {
    let cancelled = false;
    listPosts({ sort: "newest", limit: 3 })
      .then((res) => {
        if (cancelled) return;
        setPosts(res.items || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items =
    posts.length > 0
      ? posts.map((p) => ({
          slug: p.slug,
          image: p.cover_image || "/Image-Container@2x.webp",
          title: p.title,
          description: p.excerpt || "",
          category: p.category || "",
          readingMinutes: p.reading_minutes || 0,
          date: formatDate(p.published_at),
        }))
      : FALLBACK_ITEMS;

  return (
    <section
      className={[styles.blogPart, className].join(" ")}
      data-testid="blog-section"
    >
      <div className={styles.parallaxBg} aria-hidden="true" />
      <div ref={parallaxRef} className={styles.inner}>
        <div className={styles.headerRow}>
          <h2 className={styles.h2}>
            <span className={styles.spanAccent}>БЛОГ</span>
            <span className={styles.spanBlack}> АГРОНОМА</span>
          </h2>
        </div>

        <div className={styles.cardsGroup}>
          {items.map((item, idx) => (
            <div key={item.slug || `fallback-${idx}`} className={styles.cardSlot}>
              <TiltCard maxTilt={3} lift={4}>
                <CardBlog1
                  slug={item.slug || undefined}
                  image={item.image}
                  title={item.title}
                  description={item.description}
                  category={item.category}
                  readingMinutes={item.readingMinutes}
                  date={item.date}
                />
              </TiltCard>
            </div>
          ))}
        </div>

        <div className={styles.footerRow}>
          <Link to="/blog" className={styles.allLink} data-testid="welcome-blog-all">
            Всі статті
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>

        {loaded && posts.length === 0 && (
          <p className={styles.empty}>Скоро тут зʼявляться нові статті від наших агрономів.</p>
        )}
      </div>
    </section>
  );
};

export default BlogPart1;
