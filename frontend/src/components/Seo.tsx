import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Seo — універсальний компонент per-page SEO для TAMIS АГРО.
 * Інкапсулює title / description / canonical / OG / Twitter теги.
 *
 * Якщо поле не передано — використовуються дефолти з index.html (не дублюємо).
 * Title завжди отримує суфікс " | TAMIS АГРО" (крім випадку, коли вже містить його).
 */
export interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  /** JSON-LD структуровані дані. Можна передати один обʼєкт або масив. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_NAME = "TAMIS АГРО";
const SITE_URL = "https://tamis-agro.ua";

const Seo: React.FC<SeoProps> = ({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
  jsonLd,
}) => {
  const fullTitle = title
    ? title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`
    : undefined;
  const url = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${SITE_URL}${canonical}`
    : undefined;
  const imageUrl = image
    ? image.startsWith("http")
      ? image
      : `${SITE_URL}${image}`
    : undefined;

  const jsonLdArr = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];

  return (
    <Helmet>
      {fullTitle && <title>{fullTitle}</title>}
      {description && <meta name="description" content={description} />}
      {url && <link rel="canonical" href={url} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* OpenGraph */}
      {fullTitle && <meta property="og:title" content={fullTitle} />}
      {description && (
        <meta property="og:description" content={description} />
      )}
      {type && <meta property="og:type" content={type} />}
      {url && <meta property="og:url" content={url} />}
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter */}
      {fullTitle && <meta name="twitter:title" content={fullTitle} />}
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}

      {/* JSON-LD */}
      {jsonLdArr.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default Seo;
