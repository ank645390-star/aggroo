import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Box, Droplet, Thermometer, Archive, Atom } from "lucide-react";
import Tag1 from "./tag1";
import Star1 from "./star1";
import VolumeChip1 from "./volume-chip1";
import Counter1 from "./counter1";
import PrimaryButton1 from "./primary-button1";
import SecondaryButton1 from "./secondary-button1";
import ShieldError1 from "./shield-error1";
import Clock1 from "./clock1";
import { useCart } from "../../context/CartContext";
import { useCallbackModal } from "../../context/CallbackContext";
import { type Product, listPublicCategories } from "../../lib/products-api";
import styles from "./frame-component6.module.css";

export type FrameComponent6Type = {
  className?: string;
  /**
   * Optional dynamic product fetched from the API.
   * When provided, every visible field on the page is sourced from it.
   * Without it the component falls back to the static demo (ФЛОРЕС).
   */
  product?: Product | null;
};

/* Изображения товара: main = крупное фото, thumb = миниатюра 64x64
   Кликая по миниатюре пользователь переключает крупное фото. */
const PRODUCT_IMAGES = [
  { main: "/Frame-4@3x.webp",   thumb: "/Frame-190@2x.png", alt: "ФЛОРЕС загальний вигляд" },
  { main: "/Frame-1@3x.webp",   thumb: "/Frame-193@2x.png", alt: "ФЛОРЕС лист" },
  { main: "/Frame-190@2x.png", thumb: "/Frame-194@2x.png", alt: "ФЛОРЕС у склянці" },
  { main: "/Frame-193@2x.png", thumb: "/Frame-195@2x.png", alt: "ФЛОРЕС етикетка" },
];

const STAR_ITEMS = Array.from({ length: 5 }, () => ({
  size: 16 as const,
  star: "/Star.svg",
  starHeight: "16px" as const,
  starWidth: "16px" as const,
}));

/* Опции объёма с базовыми ценами (5Л = 2400 ₴ по дефолту) */
const VOLUME_OPTIONS: Array<{ label: string; price: number; perLitre: number }> = [
  { label: "1Л",  price: 480,  perLitre: 480 },
  { label: "5Л",  price: 2400, perLitre: 480 },
  { label: "10Л", price: 4500, perLitre: 450 },
];

const FrameComponent6: React.FC<FrameComponent6Type> = ({ className = "", product = null }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVolumeIndex, setSelectedVolumeIndex] = useState(1); // 5Л
  const [quantity, setQuantity] = useState(1);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({
    /* Defaults match seeded product_categories — used until the API call
       returns (so we never display the raw slug like "rodenticide"). */
    biopesticide: "Біоінсектициди",
    macro: "Макро та мікроелементи",
    inoculant: "Інокулянти",
    adjuvant: "Допоміжні речовини",
    rodenticide: "Родентициди",
    organic: "Органічні добрива",
    fungicide: "Фунгіциди",
    insecticide: "Інсектициди",
    herbicide: "Гербіциди",
    biofertilizer: "Біодобрива",
    "growth-stimulator": "Стимулятори росту",
    fertilizer: "Добрива",
  });

  const { addItem, openCart } = useCart();
  const { openModal: openCallback } = useCallbackModal();

  /* ============================================================
   * MOBILE swipe-carousel track: keep `activeImage` in sync with
   * what the user has scrolled to, and provide programmatic
   * scroll for the ‹ / › arrow buttons. The same DOM works for
   * desktop (only the active slide is shown via CSS at >768px).
   * ============================================================ */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const onTrackScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // Sync activeImage from scroll on BOTH mobile and desktop — the track
    // is a horizontal scroll-snap carousel on both viewports now.
    const slideW = el.clientWidth;
    if (!slideW) return;
    const idx = Math.round(el.scrollLeft / slideW);
    setActiveImage((cur) => (cur === idx ? cur : idx));
  }, []);
  const scrollToSlide = useCallback((idx: number) => {
    const el = trackRef.current;
    if (!el) return;
    const safe = Math.max(0, Math.min(idx, (productImages?.length || 1) - 1));
    setActiveImage(safe);
    // Programmatic scroll works on both mobile and desktop.
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ left: safe * el.clientWidth, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load category slug -> label map once (overrides the seeded defaults
     so admin-renamed categories work too). */
  useEffect(() => {
    let cancelled = false;
    listPublicCategories()
      .then((d) => {
        if (cancelled) return;
        const m: Record<string, string> = {};
        (d?.items || []).forEach((c: any) => {
          if (c?.slug) m[c.slug] = c.label || c.slug;
        });
        if (Object.keys(m).length > 0) {
          setCategoryMap((prev) => ({ ...prev, ...m }));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  /* ===== Derived product fields (real product overrides demo data) ===== */
  const productImages = useMemo(() => {
    if (product) {
      const photos = (product.photos && product.photos.length > 0)
        ? product.photos
        : (product.photo ? [product.photo] : []);
      if (photos.length > 0) {
        return photos.map((src, i) => ({
          main: src,
          thumb: src,
          alt: `${product.name} — фото ${i + 1}`,
        }));
      }
    }
    return PRODUCT_IMAGES;
  }, [product]);

  const volumeOptions = useMemo(() => {
    if (product && product.variants && product.variants.length > 0) {
      return product.variants.map((v) => {
        const raw = (v.volume || "").trim();
        const label = raw.replace(/\s+/g, "");
        // Extract numeric volume in litres (supports "5 Л", "5 л", "5L", "5 л.")
        const m = raw.match(/([\d.,]+)/);
        const litres = m ? parseFloat(m[1].replace(",", ".")) : 1;
        const perLitre = litres > 0 ? Math.round(v.price / litres) : Math.round(v.price);
        return { label, price: v.price, perLitre };
      });
    }
    if (product) {
      // Synthesize tiered prices around base "per litre" — 1Л / 5Л / 10Л
      const perL = Math.round(product.price);
      return [
        { label: "1Л",  price: Math.round(perL * 1.10),     perLitre: Math.round(perL * 1.10) },
        { label: "5Л",  price: perL * 5,                    perLitre: perL },
        { label: "10Л", price: Math.round(perL * 10 * 0.93), perLitre: Math.round(perL * 0.93) },
      ];
    }
    return VOLUME_OPTIONS;
  }, [product]);

  /* When product loads (or its variants change), select the variant matching default_volume */
  useEffect(() => {
    if (!product) return;
    const target = (product.default_volume || "5 Л").trim().replace(/\s+/g, "").toLowerCase();
    const idx = volumeOptions.findIndex((v) => v.label.trim().toLowerCase() === target);
    if (idx >= 0) setSelectedVolumeIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const current = productImages[Math.min(activeImage, productImages.length - 1)] || productImages[0];
  const selectedVolume = volumeOptions[Math.min(selectedVolumeIndex, volumeOptions.length - 1)] || volumeOptions[0];
  const totalPrice = selectedVolume.price * quantity;

  // Двокольоровий H1 (admin-configurable): дві окремі частини, дві
  // конкретні CSS-кольори. Без авто-парсингу/split-логіки — адмін
  // налаштовує кожну частину явно в адмінці.
  const titleBlack = (product?.title_black || "").trim();
  const titleGrey = (product?.title_grey || "").trim();
  // Fallback (нема жодної з двох частин): використовуємо просте `name` (чорне).
  const titleFallback = !titleBlack && !titleGrey;
  const shortName = product ? product.name : "Флорес";
  const description = product
    ? product.short_desc
    : "Удосконалений органічний стимулятор росту для підвищення врожайності сільськогосподарських культур. Cприяє швидкому відновленню біохімічних процесів у рослині.";
  const breadcrumbCategoryLabel = product
    ? (categoryMap[product.category || ""] || product.category || "Каталог")
    : "Макро та мікроелементи";
  const ratingNumber = product ? product.rating : 4.9;
  const reviews = product ? product.reviews : 100;
  const inStock = product ? product.in_stock : true;
  const productId = product ? product.id : "flores";

  const handleAddToCart = () => {
    addItem({
      id: `${productId}-${selectedVolume.label}`,
      productId,
      name: shortName,
      category: breadcrumbCategoryLabel,
      volume: selectedVolume.label.replace("Л", " Л"),
      price: selectedVolume.price,
      quantity,
      image: current?.main || PRODUCT_IMAGES[0].main,
    });
    openCart();
  };

  return (
    <section className={[styles.productSectionWrapper, className].join(" ")}>
      <div className={styles.productSection}>
        {/* === BREADCRUMBS (unified style — matches /catalog & /contacts) === */}
        <nav className={styles.productHeader} aria-label="Хлібні крихти">
          <Link to="/" className={styles.breadcrumbLink}>Головна</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <Link to="/catalog" className={styles.breadcrumbLink}>Каталог</Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{shortName}</span>
        </nav>

        {/* === MAIN CONTENT ROW (1680 × 1136) ============================ */}
        <div className={styles.mainContent}>
          {/* === IMAGE GALLERY 828 × 720 ================================ */}
          <div className={styles.image}>
            {/* Swipe track — on desktop only the active slide is visible
                (others are display:none via CSS); on mobile (<=768) the
                track becomes a horizontal scroll-snap container so the
                user can swipe through photos. */}
            <div
              ref={trackRef}
              className={styles.swiperTrack}
              onScroll={onTrackScroll}
              data-count={productImages.length}
            >
              {productImages.map((img, i) => (
                <div
                  key={`${img.main}-${i}`}
                  className={[
                    styles.swiperSlide,
                    i === activeImage ? styles.swiperSlideActive : "",
                  ].join(" ")}
                  aria-hidden={i !== activeImage}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    className={styles.mainPhoto}
                    src={img.main}
                    alt={img.alt}
                  />
                </div>
              ))}
            </div>

            {/* Prev / Next arrow buttons (mobile only via CSS) */}
            {productImages.length > 1 && (
              <>
                <button
                  type="button"
                  className={[styles.galleryArrow, styles.galleryArrowPrev].join(" ")}
                  onClick={() =>
                    scrollToSlide(
                      (activeImage - 1 + productImages.length) % productImages.length,
                    )
                  }
                  aria-label="Попереднє фото"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M12.5 4 7 10l5.5 6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={[styles.galleryArrow, styles.galleryArrowNext].join(" ")}
                  onClick={() =>
                    scrollToSlide((activeImage + 1) % productImages.length)
                  }
                  aria-label="Наступне фото"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="m7.5 4 5.5 6-5.5 6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Thumbnails — DESKTOP layout (absolute, top-left over image) */}
            <div className={styles.thumbStrip}>
              {productImages.map((img, i) => (
                <button
                  key={`${img.thumb}-${i}`}
                  type="button"
                  className={[
                    styles.thumb,
                    i === activeImage ? styles.thumbActive : "",
                  ].join(" ")}
                  onClick={() => scrollToSlide(i)}
                  aria-label={"Перегляд " + (i + 1)}
                >
                  <img loading="lazy" decoding="async" src={img.thumb} alt={img.alt} />
                </button>
              ))}
            </div>

            {/* MOBILE thumbnails — OVERLAY inside the photo card at the
                bottom (per Figma spec). Hidden on desktop. Centered, max 5
                thumbs supported via overflow-x scroll. */}
            {productImages.length > 1 && (
              <div className={styles.thumbRowMobile}>
                {productImages.map((img, i) => (
                  <button
                    key={`m-${img.thumb}-${i}`}
                    type="button"
                    className={[
                      styles.thumbMobile,
                      i === activeImage ? styles.thumbMobileActive : "",
                    ].join(" ")}
                    onClick={() => scrollToSlide(i)}
                    aria-label={"Перегляд " + (i + 1)}
                  >
                    <img loading="lazy" decoding="async" src={img.thumb} alt={img.alt} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* === TEXT BLOCK 828 × 1136 ================================== */}
          <div className={styles.textBlock}>
            <div className={styles.textBlockInner}>
              {/* === TOP ROW: tag+rating + title + description ========== */}
              <section className={styles.topRow}>
                <div className={styles.headlineGroup}>
                  <div className={styles.tagParent}>
                    <Tag1
                      prop="Підсилювач росту "
                      showIcon={false}
                      showTag
                      tagBorder="unset"
                      tagHeight="unset"
                      tagPosition="unset"
                      tagTop="unset"
                      tagLeft="unset"
                      tagBackgroundColor="#f7fae8"
                      divFontSize="12px"
                      size="16"
                      showFire={false}
                    />
                    <div className={styles.rating}>
                      <div className={styles.star}>
                        {STAR_ITEMS.map((item, index) => (
                          <Star1
                            key={index}
                            size={item.size}
                            star={item.star}
                            starHeight={item.starHeight}
                            starWidth={item.starWidth}
                          />
                        ))}
                      </div>
                      <div className={styles.ratingNumber}>{ratingNumber.toFixed(1)} ({reviews})</div>
                    </div>
                  </div>
                  <h1 className={styles.title}>
                    {/* Двокольоровий H1: дві окремі частини, повністю
                        керовані адміном (без авто-split логіки).
                        - `title_black`  → чорний колір (--text-black)
                        - `title_grey`   → сірий  колір (--text-grey)
                        Якщо обидві порожні — рендеримо просте `name`. */}
                    {titleFallback ? (
                      <span>{product?.name || "Флорес"}</span>
                    ) : (
                      <>
                        {titleBlack && <span>{titleBlack}</span>}
                        {titleBlack && titleGrey && " "}
                        {titleGrey && (
                          <span className={styles.titleAccent}>{titleGrey}</span>
                        )}
                      </>
                    )}
                  </h1>
                </div>
                <div className={styles.description}>{description}</div>
              </section>

              {/* === PARAMETERS CARD — admin-configurable feature rows.
                   Кожен рядок має ФІКСОВАНУ іконку (lucide-react, 20×20,
                   одна колекція — однаково на web/mobile) + лейбл, а ЗНАЧЕННЯ
                   адмін задає в полі товару. Якщо значення порожнє — рядок
                   приховується. ====================================== */}
              <div className={styles.featureGroup}>
                <div className={styles.featureRowParent}>
                  {(() => {
                    const culturesVal = ((product as any)?.cultures ?? "Всі культури") as string;
                    const doseVal = (product?.norm ?? "0,5-1,0 л/га") as string;
                    const storageTempVal = (product?.storage_temp ?? "15-25°C") as string;
                    const storagePeriodVal = (product?.storage_period ?? "2 роки") as string;
                    const bacteriaVal = ((product as any)?.bacteria_genus ?? "Bacillus subtilis") as string;
                    /* Per user spec — ЗАВЖДИ 5 рядків (не фільтруємо порожні).
                       Якщо admin лишив поле порожнім — показуємо placeholder
                       з дефолтом, щоб картка не "ламалась" на 4 рядки. */
                    const rows = [
                      { key: "cultures",        icon: Box,         label: "Культури",          value: culturesVal || "Всі культури" },
                      { key: "dose",            icon: Droplet,     label: "Доза",              value: doseVal || "0,5-1,0 л/га" },
                      { key: "storage_temp",    icon: Thermometer, label: "Умови зберігання",  value: storageTempVal || "15-25°C" },
                      { key: "storage_period",  icon: Archive,     label: "Період зберігання", value: storagePeriodVal || "2 роки" },
                      { key: "bacteria_genus",  icon: Atom,        label: "Бактерії роду",     value: bacteriaVal || "Bacillus subtilis" },
                    ];
                    return (
                      <div className={styles.featureRow}>
                        {rows.map((r) => {
                          const Icon = r.icon;
                          return (
                            <div className={styles.featureCell} key={r.key}>
                              <Icon size={20} strokeWidth={1.6} className={styles.featureIcon} aria-hidden="true" />
                              <div className={styles.featureText}>
                                <div className={styles.featureLabel}>{r.label}</div>
                                <div className={styles.featureValue}>{r.value}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* === OPTIONS / PRICE / BUTTONS  748 × 288 ============== */}
              <section className={styles.purchaseBlock}>
                <div className={styles.optionsRow}>
                  <div className={styles.optionsGroup}>
                    <div className={styles.optionsLabel}>Опції об’єму:</div>
                    <div className={styles.volumeChipGroup}>
                      {volumeOptions.map((item, index) => (
                        <VolumeChip1
                          key={`${item.label}-${index}`}
                          state={index === selectedVolumeIndex ? "Active" : "Inactive"}
                          prop={item.label}
                          onClick={() => setSelectedVolumeIndex(index)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.counterGroup}>
                    <div className={styles.optionsLabel}>Кількість:</div>
                    <Counter1
                      value={quantity}
                      onChange={setQuantity}
                      min={1}
                      max={99}
                      size="20"
                      size1="20"
                    />
                  </div>
                </div>

                <div className={styles.priceRow}>
                  <div className={styles.availabilityStatus} data-instock={inStock ? "true" : "false"}>
                    <div className={styles.availabilityDot} />
                    <div className={styles.availabilityText}>
                      {inStock ? "В наявності" : "Немає в наявності"}
                    </div>
                  </div>
                  <div className={styles.priceParent}>
                    <h2 className={styles.price}>
                      {totalPrice.toLocaleString("uk-UA")} ₴
                    </h2>
                    <div className={styles.priceUnit}>
                      від {selectedVolume.perLitre} ₴/л
                    </div>
                  </div>
                </div>

                <div className={styles.buttonsRow}>
                  <PrimaryButton1
                    state="Default"
                    type="Filled"
                    prop="Замовити"
                    showCall={false}
                    onClick={handleAddToCart}
                    primaryButtonPadding="0 16px"
                    primaryButtonWidth="unset"
                    primaryButtonHeight="60px"
                    primaryButtonFlex="1"
                    size="24"
                  />
                  <SecondaryButton1
                    state="Default"
                    type="Outline"
                    prop="Зателефонуйте мені"
                    showIcon
                    size="24"
                    onClick={openCallback}
                  />
                </div>
              </section>

              {/* === DELIVERY ROW ====================================== */}
              <section className={styles.deliveryRow}>
                <div className={styles.deliveryHeading}>Безкоштовна Доставка</div>
                <div className={styles.deliveryLogos}>
                  <div className={styles.deliveryPartner}>
                    <img loading="lazy" decoding="async"
                      className={styles.deliveryIcon}
                      width={50}
                      height={50}
                      alt="Нова Пошта"
                      src="/arcticons-nova-post.svg"
                    />
                    <div className={styles.deliveryName}>Нова Пошта</div>
                  </div>
                  <div className={styles.deliveryPartner}>
                    <img loading="lazy" decoding="async"
                      className={styles.deliveryIcon}
                      width={50}
                      height={50}
                      alt="Укр Пошта"
                      src="/arcticons-ukrposhta.svg"
                    />
                    <div className={styles.deliveryName}>Укр Пошта</div>
                  </div>
                </div>
                <div className={styles.deliveryLink}>
                  <button
                    type="button"
                    className={styles.deliveryToggle}
                    onClick={() => setDeliveryOpen((v) => !v)}
                    aria-expanded={deliveryOpen}
                  >
                    <span>{deliveryOpen ? "Згорнути" : "Детальніше про доставку"}</span>
                    <svg
                      className={[
                        styles.deliveryChevron,
                        deliveryOpen ? styles.deliveryChevronOpen : "",
                      ].join(" ")}
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 5.25L7 8.75L10.5 5.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div
                  className={[
                    styles.deliveryDetails,
                    deliveryOpen ? styles.deliveryDetailsOpen : "",
                  ].join(" ")}
                  aria-hidden={!deliveryOpen}
                >
                  <div className={styles.deliveryDetailsInner}>
                    <ul className={styles.deliveryList}>
                      <li>
                        <strong>Нова Пошта</strong> — відділення, поштомати,
                        кур'єрська доставка по Україні. Безкоштовно при замовленні
                        від 1 500 ₴.
                      </li>
                      <li>
                        <strong>Укрпошта</strong> — стандартна та експрес
                        доставка по всім населеним пунктам України.
                      </li>
                      <li>
                        Самовивіз зі складу <strong>м. Київ, вул. Промислова, 12</strong>
                        — доступний у будні з 9:00 до 18:00.
                      </li>
                      <li>
                        Термін формування замовлення — <strong>1 робочий день</strong>,
                        доставка по Україні — <strong>3-5 робочих днів</strong>.
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* === STORAGE / DELIVERY TIME =========================== */}
              <section className={styles.storageInfo}>
                <div className={styles.storageRow}>
                  <ShieldError1 size={20} />
                  <div className={styles.storageText}>
                    Зберігається в прохолодному, сухому місці, захищеному від
                    сонячних променів
                  </div>
                </div>
                <div className={styles.storageRow}>
                  <Clock1 size={20} />
                  <div className={styles.storageText}>
                    Доставка протягом 3-5 робочих днів
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FrameComponent6;
