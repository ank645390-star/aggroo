/**
 * Lighthouse CI configuration for TAMIS АГРО
 * ---------------------------------------------------------------------
 * Run locally:
 *   npx @lhci/cli@latest autorun
 *
 * In CI (GitHub Actions) — see .github/workflows/lighthouse.yml.
 *
 * Перформанс-budgets орієнтовані на високі стандарти "lightweight
 * marketing site". Якщо який-небудь метрик нижче порогу — CI блокує merge.
 * ---------------------------------------------------------------------
 */
module.exports = {
  ci: {
    collect: {
      /* Запускаємо локальний serve build/ перед збором метрик */
      staticDistDir: "./build",
      /* Сторінки, які повинні відповідати performance-budget */
      url: [
        "http://localhost/index.html",
        "http://localhost/index.html#/catalog",
        "http://localhost/index.html#/about",
        "http://localhost/index.html#/cultures",
        "http://localhost/index.html#/contacts",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        /* Емуляція справжнього CDN: вже стиснутий контент */
        extraHeaders: JSON.stringify({}),
        /* Throttling — реалістична бізнес-мережа */
        throttlingMethod: "simulate",
        chromeFlags: "--no-sandbox --headless",
      },
    },
    assert: {
      /* Перформанс-budgets: блокуємо merge якщо метрики деградують */
      assertions: {
        /* Core Web Vitals */
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.95 }],

        /* Performance metrics — конкретні таймінги */
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "speed-index": ["warn", { maxNumericValue: 3000 }],

        /* Resource size budgets */
        "total-byte-weight": ["warn", { maxNumericValue: 2500000 }],
        "unused-javascript": ["warn", { maxNumericValue: 100000 }],
        "unused-css-rules": ["warn", { maxNumericValue: 50000 }],
        "modern-image-formats": "error",
        "uses-optimized-images": "warn",
        "uses-text-compression": "error",
        "uses-responsive-images": "warn",
        "render-blocking-resources": ["warn", { maxNumericValue: 500 }],

        /* SEO */
        "meta-description": "error",
        "document-title": "error",
        "html-has-lang": "error",
        "html-lang-valid": "error",
        "viewport": "error",
        "canonical": "warn",
      },
    },
    upload: {
      /* За замовчуванням — артефакти зберігаються локально.
       * Для public dashboard поставте target: "temporary-public-storage" */
      target: "filesystem",
      outputDir: "./lighthouse-reports",
      reportFilenamePattern: "%%PATHNAME%%-%%DATETIME%%-%%EXTENSION%%",
    },
    server: {
      /* для self-hosted Lighthouse server (опційно) */
    },
  },
};
