import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Seo from "../components/Seo";
import Document2 from "../components/figma/document2";
import FrameComponent6 from "../components/figma/frame-component6";
import Image2 from "../components/figma/image2";
import TabGroup1, { TabKey } from "../components/figma/tab-group1";
import TextBlock1 from "../components/figma/text-block1";
import FrameComponent8 from "../components/figma/frame-component8";
import LogisticsSection from "../components/figma/logistics-section";
import FrameComponent9 from "../components/figma/frame-component9";
import CombinedProducts from "../components/figma/combined-products";
import ProductReviews from "../components/figma/product-reviews";
import CtaSection1 from "../components/figma/cta-section1";
import Footer1 from "../components/figma/footer1";
import { getProduct, type Product, type TabBlock } from "../lib/products-api";
import styles from "./desktop1.module.css";

/* ----- Tiny HTML helper (renders trusted admin-authored HTML) ----- */
const Html: React.FC<{ html?: string; className?: string }> = ({ html, className }) =>
  html ? (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  ) : null;

/* ----- Inline SVG icons used inside notes/dosage callouts ----- */
const IconInfo = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconWarn = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const Desktop1: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>("opis");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(!!slug);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setProduct(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getProduct(slug)
      .then((p) => { if (!cancelled) setProduct(p); })
      .catch((e) => { if (!cancelled) setError(e?.response?.data?.detail || "Товар не знайдено"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  /* ============================================================
     ОПИС — original Figma design (Image2 hero + Problem/Solution)
     ============================================================ */
  const renderOpis = () => {
    const d = product?.description;
    const heroImage = d?.hero_image || "/tree.webp";
    const titleLine1 = d?.title_line1 || "Відновлення";
    const titleLine2 = d?.title_line2 || "після стресу.";
    const titleSubline = d?.title_subline || "Стабільний врожай.";
    const chips = d?.chips;
    const problem = d?.problem;
    const solution = d?.solution;

    return (
      <>
        <Image2
          heroImage={heroImage}
          heroAlt={product ? `${product.name} — ${product.short_desc}` : "Дерево — відновлення після стресу"}
          chips={chips && chips.length > 0 ? chips : undefined}
        />
        <section className={styles.featureColumnWrapper}>
          <div className={styles.featureColumn}>
            <h1 className={styles.h1}>
              <span className={styles.span}>
                <span>{titleLine1}</span>
              </span>
              <span className={styles.span2}>
                <span className={styles.span}>{` `}</span>
                <span>{titleLine2}</span>
                <span className={styles.span4}>{` `}</span>
              </span>
            </h1>
            <h2 className={styles.h2}>{titleSubline}</h2>
          </div>
        </section>
        <section className={styles.textBlockWrapper}>
          <div className={styles.textBlock}>
            <TextBlock1
              prop={(problem?.title || "Проблема") + " "}
              intro={<Html html={problem?.intro_html} />}
              prop1={<Html html={problem?.outro_html} />}
            />
            <TextBlock1
              prop={(solution?.title || "Рішення") + " "}
              textBlockAlignItems="flex-end"
              lineHeight="312px"
              lineBorderRight="2px solid #b3d217"
              textContentGap="24px"
              headingsBackgroundColor="#f7fae8"
              h3Color="unset"
              intro={<Html html={solution?.intro_html} />}
              h3Content={<Html html={solution?.outro_html} />}
            />
          </div>
        </section>
      </>
    );
  };

  /* ============================================================
     Дозування / Склад / Сумісність / Характеристика — структуровані картки
     ============================================================ */
  const renderRichTab = (
    block: TabBlock | undefined,
    fallbackTitle: string,
    accent: "lime" | "olive" | "earth" | "sand",
    icon: React.ReactNode,
  ) => {
    const title = block?.title || fallbackTitle;
    const intro = block?.intro || "";
    const items = block?.items || [];
    const note  = block?.note || "";
    return (
      <section className={styles.richTabWrapper} data-accent={accent}>
        <div className={styles.richTabHead}>
          <div className={styles.richTabIcon} aria-hidden="true">{icon}</div>
          <div className={styles.richTabHeadText}>
            <h2 className={styles.richTabTitle}>{title}</h2>
            {intro ? <p className={styles.richTabIntro}>{intro}</p> : null}
          </div>
        </div>
        {items.length > 0 && (
          <ul className={styles.richTabList}>
            {items.map((it, i) => (
              <li key={i} className={styles.richTabItem}>
                <span className={styles.richTabBullet} aria-hidden="true">•</span>
                <span
                  className={styles.richTabItemText}
                  dangerouslySetInnerHTML={{ __html: it.text }}
                />
              </li>
            ))}
          </ul>
        )}
        {note ? (
          <div className={styles.richTabNoteBox}>
            <div className={styles.richTabNoteLabel}>Примітка</div>
            <p className={styles.richTabNote}>{note}</p>
          </div>
        ) : null}
      </section>
    );
  };

  const renderSpecsTab = () => {
    const block = product?.specs;
    const title = block?.title || "Характеристика";
    const intro = block?.intro || "";
    const items = block?.items || [];
    const note  = block?.note || "";

    /* Try to split each "label: value" item into label + value for a clean table */
    const rows = items.map((it) => {
      const text = it.text || "";
      // Find first " — " or ": " separator
      const m = text.match(/^(.*?)(?:\s—\s|:\s)(.*)$/);
      if (m) return { label: m[1].trim(), value: m[2].trim() };
      return { label: text, value: "" };
    });

    return (
      <section className={styles.richTabWrapper} data-accent="sand">
        <div className={styles.richTabHead}>
          <div className={styles.richTabIcon} aria-hidden="true">{IconChart}</div>
          <div className={styles.richTabHeadText}>
            <h2 className={styles.richTabTitle}>{title}</h2>
            {intro ? <p className={styles.richTabIntro}>{intro}</p> : null}
          </div>
        </div>
        {rows.length > 0 && (
          <div className={styles.specsTableWrap}>
            <table className={styles.specsTable}>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <th scope="row" dangerouslySetInnerHTML={{ __html: r.label }} />
                    <td dangerouslySetInnerHTML={{ __html: r.value || "—" }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {note ? (
          <div className={styles.richTabNoteBox}>
            <div className={styles.richTabNoteLabel}>Примітка</div>
            <p className={styles.richTabNote}>{note}</p>
          </div>
        ) : null}
      </section>
    );
  };

  /* ---------- Inline icons (matched to design system) ---------- */
  const IconDrop = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
  const IconBacteria = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9.5" cy="11" r="0.9" fill="currentColor" />
      <circle cx="14" cy="13.5" r="0.9" fill="currentColor" />
      <circle cx="12" cy="9.5" r="0.7" fill="currentColor" />
      <path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
  const IconShield = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 3v6c0 4.5-3.5 8.3-8 9-4.5-.7-8-4.5-8-9V6l8-3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const IconChart = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h18M9 3v18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );

  /* =================================================================
     DOSAGE — vertical timeline of numbered steps
     =================================================================
     Parser: each item.text looks like
       "<b>Title (or label):</b> rest of description ..."
     We split on the first "</b>" (or "<b>...:</b>") to get (title, desc).
     Fallback: whole text becomes desc, title = "Крок N"
     ----------------------------------------------------------------- */
  const parseStepItem = (text: string, fallback: string): { title: string; desc: string } => {
    const m = text.match(/^\s*<b>(.+?)<\/b>\s*[:.\u2014\u2013-]?\s*(.*)$/i);
    if (m) {
      const title = m[1].replace(/[:.]+\s*$/, "").trim();
      const desc = (m[2] || "").trim();
      return { title, desc };
    }
    const m2 = text.match(/^(.+?)[:\u2014\u2013-]\s+(.+)$/);
    if (m2) return { title: m2[1].trim(), desc: m2[2].trim() };
    return { title: fallback, desc: text };
  };

  const renderDosageTab = () => {
    const block = product?.dosage;
    const title = block?.title || "Дозування";
    const intro = block?.intro || "";
    const items = block?.items || [];
    const note  = block?.note || "";

    /* Pick a phase icon per step in a rotating pattern (drop / shield / chart) */
    const phaseMeta = (i: number): { label: string; icon: React.ReactNode } => {
      const labels = ["Підготовка", "Внесення", "Підживлення", "Закріплення"];
      const icons: React.ReactNode[] = [IconDrop, IconBacteria, IconShield, IconChart];
      return { label: labels[i % labels.length], icon: icons[i % icons.length] };
    };

    return (
      <section className={styles.dosageTab}>
        <div className={styles.dosageHead}>
          <div className={styles.dosageHeadIcon}>{IconDrop}</div>
          <div className={styles.dosageHeadText}>
            <h2 className={styles.dosageTitle}>{title}</h2>
            {intro ? <p className={styles.dosageIntro}>{intro}</p> : null}
          </div>
          {items.length > 0 && (
            <div className={styles.dosageStepCount} aria-label={`${items.length} кроків`}>
              <span className={styles.dosageStepCountNum}>{items.length}</span>
              <span className={styles.dosageStepCountLabel}>{items.length === 1 ? "крок" : "кроків"}</span>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className={styles.dosageTimeline}>
            {items.map((it, i) => {
              const parsed = parseStepItem(it.text, `Крок ${i + 1}`);
              const meta = phaseMeta(i);
              const isLast = i === items.length - 1;
              return (
                <div key={i} className={styles.dosageStep}>
                  <div className={styles.dosageStepRail} aria-hidden="true">
                    <div className={styles.dosageStepNum}>{i + 1}</div>
                    {!isLast && <div className={styles.dosageStepLine} />}
                  </div>
                  <div className={styles.dosageStepBody}>
                    <div className={styles.dosageStepPhase}>
                      <span className={styles.dosageStepPhaseIcon}>{meta.icon}</span>
                      <span className={styles.dosageStepPhaseLabel}>{meta.label}</span>
                    </div>
                    <div
                      className={styles.dosageStepTitle}
                      dangerouslySetInnerHTML={{ __html: parsed.title }}
                    />
                    <div
                      className={styles.dosageStepDesc}
                      dangerouslySetInnerHTML={{ __html: parsed.desc }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {note ? (
          <div className={styles.dosageNoteBox}>
            <div className={styles.dosageNoteIcon}>{IconInfo}</div>
            <div className={styles.dosageNoteBody}>
              <div className={styles.dosageNoteLabel}>Порада агронома</div>
              <p className={styles.dosageNoteText}>{note}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  /* =================================================================
     COMPOSITION — molecular cards grid
     =================================================================
     Parser tries:
       <b>NAME</b>  — VALUE  (DESCRIPTION)
       <b>NAME</b>  — VALUE
       NAME — VALUE  (DESC)
     ----------------------------------------------------------------- */
  const parseCompoItem = (text: string): { name: string; value: string; desc: string } => {
    // Strip leading <b>..</b> if present
    const tagMatch = text.match(/^\s*<b>([^<]+)<\/b>\s*(.*)$/i);
    let name = "";
    let rest = text;
    if (tagMatch) {
      name = tagMatch[1].trim();
      rest = tagMatch[2].trim();
    }
    rest = rest.replace(/^[—\u2013\-:]\s*/, "");
    // Pull "(description)" tail
    let desc = "";
    const descMatch = rest.match(/\(([^)]+)\)\s*$/);
    if (descMatch) {
      desc = descMatch[1].trim();
      rest = rest.replace(/\(([^)]+)\)\s*$/, "").trim();
    }
    // If we didn't get a name above, try "NAME — VALUE"
    if (!name) {
      const m = rest.match(/^([^—\u2013\-:]+)\s*[—\u2013\-:]\s*(.+)$/);
      if (m) {
        name = m[1].trim();
        rest = m[2].trim();
      } else {
        name = rest;
        rest = "";
      }
    }
    return { name, value: rest, desc };
  };

  const _symbolForName = (name: string): string => {
    const map: Record<string, string> = {
      "Бродіфакум": "Brd",
      "Хелати Fe, Mn, Zn, Cu": "Fe·Mn·Zn·Cu",
      "Бор (B)": "B",
      "Молібден (Mo)": "Mo",
      "L-амінокислоти": "AA",
      "Поверхнево-активні речовини": "ПАР",
    };
    if (map[name]) return map[name];
    // Pull abbreviation from brackets first, e.g. "Бор (B)" -> "B"
    const br = name.match(/\(([^)]+)\)/);
    if (br) return br[1].trim().slice(0, 6);
    // Otherwise: first 2-3 letters
    const words = name.split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 3);
    return words.map((w) => w[0]).join("").slice(0, 4);
  };

  const renderCompositionTab = () => {
    const block = product?.composition;
    const title = block?.title || "Склад";
    const intro = block?.intro || "";
    const items = block?.items || [];
    const note  = block?.note || "";
    /* Rotating palette for component cards — keeps the design within
       our existing token set (lime, olive, forest, sand). */
    const palettes = ["lime", "forest", "olive", "earth"] as const;
    return (
      <section className={styles.compoTab}>
        <div className={styles.compoHead}>
          <div className={styles.compoHeadIcon}>{IconBacteria}</div>
          <div className={styles.compoHeadText}>
            <h2 className={styles.compoTitle}>{title}</h2>
            {intro ? <p className={styles.compoIntro}>{intro}</p> : null}
          </div>
          {items.length > 0 && (
            <div className={styles.compoCount} aria-label={`${items.length} компонентів`}>
              <span className={styles.compoCountNum}>{items.length}</span>
              <span className={styles.compoCountLabel}>{items.length === 1 ? "компонент" : "компонентів"}</span>
            </div>
          )}
        </div>
        {items.length > 0 && (
          <div className={styles.compoGrid}>
            {items.map((it, i) => {
              const p = parseCompoItem(it.text);
              const tone = palettes[i % palettes.length];
              return (
                <div
                  key={i}
                  className={styles.compoCard}
                  data-tone={tone}
                  data-symbol={_symbolForName(p.name)}
                >
                  <div className={styles.compoCardTop}>
                    <span className={styles.compoCardBadge} aria-hidden="true">
                      {_symbolForName(p.name)}
                    </span>
                    {p.value ? (
                      <span
                        className={styles.compoCardPercent}
                        dangerouslySetInnerHTML={{ __html: p.value }}
                      />
                    ) : null}
                  </div>
                  <div className={styles.compoCardName} dangerouslySetInnerHTML={{ __html: p.name }} />
                  {p.desc ? <p className={styles.compoCardDesc}>{p.desc}</p> : null}
                </div>
              );
            })}
          </div>
        )}
        {note ? (
          <div className={styles.compoNoteBox}>
            <div className={styles.compoNoteIcon}>{IconWarn}</div>
            <div>
              <div className={styles.compoNoteLabel}>Важливо</div>
              <p className={styles.compoNoteText}>{note}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  /* =================================================================
     COMPATIBILITY — split: ✓ ok column | ✗ not-ok column
     ================================================================= */
  const renderCompatibilityTab = () => {
    const block = product?.compatibility;
    const title = block?.title || "Сумісність";
    const intro = block?.intro || "";
    const items = block?.items || [];
    const note  = block?.note || "";
    /* Split items by ✓ / ✗ markers (or sumis / nesumis keywords) */
    const ok: typeof items = [];
    const no: typeof items = [];
    items.forEach((it) => {
      const txt = it.text || "";
      const stripped = txt.replace(/<\/?[bi]>/gi, "").trim();
      if (/^[✗хХ×]|не\s*сумісн|Не\s*сумісн/i.test(stripped) || stripped.includes("✗")) {
        no.push({ text: txt.replace(/[✗хХ×]\s*/g, "") });
      } else if (/^[✓v]|сумісн|Сумісн/i.test(stripped) || stripped.includes("✓")) {
        ok.push({ text: txt.replace(/[✓vV]\s*/g, "") });
      } else {
        // Default — treat as ok
        ok.push(it);
      }
    });

    return (
      <section className={styles.compatTab}>
        <div className={styles.compatHead}>
          <div className={styles.compatHeadIcon}>{IconShield}</div>
          <div className={styles.compatHeadText}>
            <h2 className={styles.compatTitle}>{title}</h2>
            {intro ? <p className={styles.compatIntroBox}>{intro}</p> : null}
          </div>
        </div>
        <div className={styles.compatGrid}>
          <div className={`${styles.compatCol} ${styles.compatColOk}`}>
            <div className={styles.compatColHead}>
              <span className={styles.compatColIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
              </span>
              <span className={styles.compatColTitle}>Повністю сумісний</span>
              <span className={styles.compatColCount}>{ok.length}</span>
            </div>
            <ul className={styles.compatList}>
              {ok.map((it, i) => (
                <li key={i} className={`${styles.compatItem} ${styles.compatItemOk}`}>
                  <span className={`${styles.compatItemMark} ${styles.compatItemMarkOk}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
                  </span>
                  <span className={styles.compatItemText} dangerouslySetInnerHTML={{ __html: it.text }} />
                </li>
              ))}
            </ul>
          </div>
          <div className={`${styles.compatCol} ${styles.compatColNo}`}>
            <div className={styles.compatColHead}>
              <span className={styles.compatColIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
              </span>
              <span className={styles.compatColTitle}>Не сумісний</span>
              <span className={styles.compatColCount}>{no.length}</span>
            </div>
            <ul className={styles.compatList}>
              {no.map((it, i) => (
                <li key={i} className={`${styles.compatItem} ${styles.compatItemNo}`}>
                  <span className={`${styles.compatItemMark} ${styles.compatItemMarkNo}`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  </span>
                  <span className={styles.compatItemText} dangerouslySetInnerHTML={{ __html: it.text }} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        {note ? (
          <div className={styles.compatNoteBox}>
            <div className={styles.compatNoteIcon}>{IconWarn}</div>
            <div className={styles.compatNoteBody}>
              <div className={styles.compatNoteLabel}>Перед застосуванням</div>
              <p className={styles.compatNoteText}>{note}</p>
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dosage":
        return renderDosageTab();
      case "composition":
        return renderCompositionTab();
      case "compatibility":
        return renderCompatibilityTab();
      case "specs":
        return renderSpecsTab();
      case "opis":
      default:
        return renderOpis();
    }
  };

  if (loading) {
    return (
      <div className={styles.desktop}>
        <Document2 />
        <div style={{ padding: 80, textAlign: "center", color: "#6b6b66" }}>Завантаження…</div>
        <Footer1 device="Desktop" />
      </div>
    );
  }

  if (error && slug) {
    return (
      <div className={styles.desktop}>
        <Document2 />
        <div style={{ padding: 80, textAlign: "center" }}>
          <h2 style={{ color: "#2c2c27", marginBottom: 12 }}>Товар не знайдено</h2>
          <p style={{ color: "#6b6b66" }}>{error}</p>
        </div>
        <Footer1 device="Desktop" />
      </div>
    );
  }

  return (
    <div className={styles.desktop}>
      <Seo
        title={product ? (product.seo_title || `${product.name} — TAMIS АГРО`) : "Біопрепарат — деталі товару"}
        description={product ? (product.seo_description || product.short_desc) : "Детальний опис біопрепарату ТАМІС АГРО: склад, дозування, культури, відгуки. Замовлення з безкоштовною доставкою по Україні."}
        canonical={product ? `/product/${product.slug}` : "/product"}
        type="product"
      />
      <Document2 />
      <FrameComponent6 product={product} />
      <main className={styles.describeSectionWrapper}>
        <div className={styles.describeSection}>
          <TabGroup1 activeTab={activeTab} onTabChange={setActiveTab} />
          {renderTabContent()}
        </div>
      </main>
      <FrameComponent8 />
      <section className={styles.chaineSectionWrapper}>
        <div className={styles.chaineSection}>
          <LogisticsSection />
        </div>
      </section>
      <FrameComponent9 productSlug={product?.slug} productName={product?.name} />
      <ProductReviews productSlug={product?.slug} />
      <CombinedProducts slug={product?.slug} />
      <CtaSection1 />
      <Footer1 device="Desktop" />
    </div>
  );
};

export default Desktop1;
