import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import Navbar1 from "../components/figma/navbar1";
import Footer1 from "../components/figma/footer1";
import CulturesNotFoundCta from "../components/cultures/CulturesNotFoundCta";
import RevealHeading from "../components/welcome/reveal-heading";
import styles from "./cultures.module.css";
import { listCulturesPublic, type Culture } from "../lib/cultures-api";
import {
  listInsideTabsPublic,
  getInsideMetaPublic,
  type InsideTab,
  type InsideMeta,
} from "../lib/inside-api";
import { useInViewOnce } from "../lib/use-in-view-once";
import { useSwipeable } from "../lib/use-swipeable";

/* =====================================================================
   /cultures — Cultures (Культури) page.
   Built strictly from the Figma design (1920px width, scaled by
   <ScaledShell>). Navbar1 + Footer1 are project-shared and untouched.

   Картки секції «Знайдіть рішення для вашої культури» повністю
   керовані з адмінки (/admin/cultures) через API /api/cultures.
   ===================================================================== */

const TABS_FALLBACK: { key: string; label: string }[] = [
  { key: "bt", label: "Bacillus thuringiensis" },
  { key: "trichoderma", label: "Trichoderma" },
  { key: "azot", label: "Азотфіксуючі бактерії" },
  { key: "humat", label: "Гумати" },
];

/* === Slides for the "Порахуйте вигоду" comparison block === */
type CompareCard = { num: string; label: string };
type CompareSlide = {
  id: string;
  title: string;
  image: string;
  chem: { name: string; rows: CompareCard[] };
  bio: { name: string; rows: CompareCard[] };
};

const COMPARE_SLIDES: CompareSlide[] = [
  {
    id: "year-1",
    title: "Рік 1: точка відліку.",
    image: "/u9976363322-Generate-a-field-with-agriculture-should-be-separ-eb554260-9dc3-4126-84b3-a7305fd2ca9e-1-1-1@2x.webp",
    chem: {
      name: "Хімія",
      rows: [
        { num: "8.5 тис грн", label: "витрати/га" },
        { num: "0%", label: "врожайність" },
        { num: "Норма", label: "стан ґрунту" },
      ],
    },
    bio: {
      name: "Біозахист",
      rows: [
        { num: "9.2 тис грн", label: "витрати/га" },
        { num: "0%", label: "врожайність" },
        { num: "Норма", label: "стан ґрунту" },
      ],
    },
  },
  {
    id: "year-3",
    title: "Рік 3: ознаки стресу",
    image: "/year3-field.webp",
    chem: {
      name: "Хімія",
      rows: [
        { num: "12.4 тис грн", label: "витрати/га" },
        { num: "-8%", label: "врожайність" },
        { num: "Виснажений", label: "стан ґрунту" },
      ],
    },
    bio: {
      name: "Біозахист",
      rows: [
        { num: "7.8 тис грн", label: "витрати/га" },
        { num: "+12%", label: "врожайність" },
        { num: "Відновлений", label: "стан ґрунту" },
      ],
    },
  },
  {
    id: "year-5",
    title: "Рік 5: екологічна катастрофа",
    image: "/year5-field.webp",
    chem: {
      name: "Хімія",
      rows: [
        { num: "18.6 тис грн", label: "витрати/га" },
        { num: "-22%", label: "врожайність" },
        { num: "Деградований", label: "стан ґрунту" },
      ],
    },
    bio: {
      name: "Біозахист",
      rows: [
        { num: "6.2 тис грн", label: "витрати/га" },
        { num: "24%", label: "врожайність" },
        { num: "Здоровий", label: "стан ґрунту" },
      ],
    },
  },
];

/* Fallback content для секції «Зазирни всередину» — використовується,
   поки публічний API ще не повернув дані (також — на випадок мережевих
   помилок). У штатному режимі ці дані повністю керовані з /admin/inside-tabs. */
const INSIDE_FALLBACK: InsideTab[] = [
  {
    id: "f-bt",
    slug: "bacillus-thuringiensis",
    label: "Bacillus thuringiensis",
    title: "Біологічний інсектицид №1 у світі",
    description:
      "Природна бактерія, яка знищує шкідників зсередини – личинки совки, молі та листокрутки перестають живитися протягом кількох годин після контакту. Діє точково: вражає тільки цільових шкідників, не чіпає бджіл, сонечок та інших корисних комах.\nПовністю розкладається в ґрунті без токсичних залишків.",
    image_url: "/inside-bacillus.webp",
    image_alt: "Bacillus thuringiensis",
    accent_color: "",
    is_active: true,
    order: 0,
  },
  {
    id: "f-tricho",
    slug: "trichoderma",
    label: "Trichoderma",
    title: "Гриб-антагоніст для захисту ґрунту",
    description:
      "Trichoderma пригнічує патогенні гриби (фузаріум, пітіум, ризоктонію) й одночасно стимулює ріст коренів. Виділяє ферменти, що розкладають органіку та підвищують доступність елементів живлення.",
    image_url: "/inside-bacillus.webp",
    image_alt: "Trichoderma",
    accent_color: "",
    is_active: true,
    order: 1,
  },
  {
    id: "f-azot",
    slug: "azotfiksuyuchi-bakterii",
    label: "Азотфіксуючі бактерії",
    title: "Азот без витрат на хімію",
    description:
      "Бульбочкові й вільноживучі бактерії перетворюють атмосферний азот на доступну для рослин форму. Економить до 30% дози мінеральних добрив без втрати врожайності.",
    image_url: "/inside-bacillus.webp",
    image_alt: "Азотфіксуючі бактерії",
    accent_color: "",
    is_active: true,
    order: 2,
  },
  {
    id: "f-humat",
    slug: "humaty",
    label: "Гумати",
    title: "Активатор ґрунту та антистресант",
    description:
      "Гумати посилюють кореневу систему, поліпшують структуру ґрунту, зв'язують важкі метали. Працюють як «активатор» для решти біопрепаратів у баковій суміші.",
    image_url: "/inside-bacillus.webp",
    image_alt: "Гумати",
    accent_color: "",
    is_active: true,
    order: 3,
  },
];

void TABS_FALLBACK; // backward-compat reference (kept for grep / future use)

const STEPS = [
  {
    n: "01. Оберіть препарат",
    d: `Визначте задачу – захист від шкідників, живлення чи стимуляція.\nПідберіть препарат під вашу культуру та фазу вегетації.\nАбо залиште це нашому спеціалісту – безкоштовна консультація за 15 хвилин.`,
    img: "/step-1-tablet.webp",
  },
  {
    n: "02. Підготуйте розчин",
    d: `Розведіть препарат у воді згідно з таблицею дозування. Стандартний бак, стандартна вода, без спеціальних умов.\nБільшість біопрепаратів можна змішувати в одному баку з добривами та навіть хімічними засобами.`,
    img: "/step-2-pour.webp",
  },
  {
    n: "03. Обробіть поле",
    d: `Обприскування тим самим обладнанням, що вже стоїть у вас на базі.\nОптимальний час – ранок або вечір, без прямого сонця.\nБіоагенти починають діяти в перші години після нанесення.`,
    img: "/step-3-spray.webp",
  },
  {
    n: "04. Збирайте результат",
    d: `Здоровий ґрунт, чистий врожай без залишків пестицидів, відповідність нормам ЄС. З кожним сезоном ефективність зростає – мікрофлора ґрунту відновлюється та працює на вас.`,
    img: "/step-4-harvest.webp",
  },
];

const FEATURES = [
  {
    title: "100% органічно",
    desc: "Натуральні інгредієнти для сталого\nсільського господарства",
    icon: "leaf",
  },
  {
    title: "Легке застосування",
    desc: "Водорозчинні формули\nдля зручного використання",
    icon: "drop",
  },
  {
    title: "Всі сезони",
    desc: "Ефективний на різних стадіях росту",
    icon: "calendar",
  },
] as const;

const WHY_CARDS = [
  {
    title: "Ефективність",
    desc: "85-92% проти основних шкідників. Біоагенти діють точково - знищують ціль, а не все живе на полі. І головне: шкідники не виробляють резистентність, на відміну від хімії, де кожен сезон потрібна нова діюча речовина.",
    image: "/why-efektyvnist.png",
  },
  {
    title: "Ціна",
    desc: "Менше обробок за сезон - менша вартість на гектар. Біопрепарати не потребують додаткових витрат на відновлення ґрунту, детоксикацію та повторні обробки через резистентність. Порахуйте повний цикл - різниця на вашому боці.",
    image: "/why-cina.png",
  },
  {
    title: "Застосування",
    desc: "Той самий обприскувач, та сама техніка, ті ж фази обробки. Змінюється тільки те, що ви заливаєте в бак. Більшість біопрепаратів сумісні з хімічними схемами захисту - можна інтегрувати поступово, без різких змін.",
    image: "/why-zastosuvannya.png",
  },
];

/* ===== Icons ===== */
const PlusIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const MinusIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ArrowRight: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
);
const LeafIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.5c1 1.5 1 5-2 7.5C16 5.5 11 4.5 11 4.5s-1 5 2.5 6c0 0 1 4-2.5 6.5s-1.5 3-1.5 3z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6" />
  </svg>
);
const DropIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);
const CalendarIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const PhoneIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.71A2 2 0 0 1 22 16.92z" />
  </svg>
);
const ClockIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/* StepsList — block-by-block reveal of the 4 timeline steps.
   КОЖЕН крок (01 / 02 / 03 / 04) має власний IntersectionObserver і
   з'являється як єдиний блок (текст + фото синхронно: opacity + slide-up)
   САМЕ В ТОЙ МОМЕНТ, коли користувач до нього доскролив. Не зліва-направо,
   не зверху-вниз — кожен рядок як одне ціле. */
const StepRow: React.FC<{ step: typeof STEPS[number]; index: number }> = ({ step, index }) => {
  const [ref, inView] = useInViewOnce<HTMLDivElement>({
    threshold: 0.25,
    rootMargin: "0px 0px -10% 0px",
  });
  return (
    <div
      ref={ref}
      className={`${styles.stepRow} ${inView ? styles.stepRowIn : ""}`}
      data-testid={`cultures-step-${index + 1}`}
    >
      <div className={styles.stepText}>
        <h3 className={styles.stepTitle}>{step.n}</h3>
        <p className={styles.stepDesc}>{step.d}</p>
      </div>
      <img
        decoding="async"
        className={styles.stepImg}
        src={step.img}
        alt={step.n}
        loading="lazy"
      />
    </div>
  );
};

const StepsList: React.FC = () => {
  return (
    <div className={styles.stepsList} data-testid="cultures-steps">
      {STEPS.map((s, i) => (
        <StepRow key={s.n} step={s} index={i} />
      ))}
    </div>
  );
};

const Cultures: React.FC = () => {
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [openCultureId, setOpenCultureId] = useState<string>("");
  const [insideTabs, setInsideTabs] = useState<InsideTab[]>(INSIDE_FALLBACK);
  const [insideMeta, setInsideMeta] = useState<InsideMeta>({ title1: "Зазирни", title2: "всередину" });
  const [activeTabId, setActiveTabId] = useState<string>(INSIDE_FALLBACK[0].id);
  const [loadingCultures, setLoadingCultures] = useState(true);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // refs for parallax effect on the "Choose culture" section bg
  const chooseSectionRef = React.useRef<HTMLElement>(null);
  const chooseBgRef = React.useRef<HTMLImageElement>(null);
  // ref for the comparison section — scroll-lock pagination
  const calcSectionRef = React.useRef<HTMLElement>(null);
  // ref to current active slide index (for wheel handler closure)
  const activeSlideRef = React.useRef<number>(0);
  React.useEffect(() => {
    activeSlideRef.current = activeSlide;
  }, [activeSlide]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listCulturesPublic();
        if (!mounted) return;
        setCultures(list);
        // Open the one marked as default, or the first
        const def = list.find((c) => c.is_default_open) || list[0];
        if (def) setOpenCultureId(def.id);
      } catch (e) {
        // silent failure — page still renders other sections
        if (mounted) setCultures([]);
      } finally {
        if (mounted) setLoadingCultures(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch «Зазирни всередину» tabs + meta from backend (fully admin-managed).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tabs, meta] = await Promise.all([
          listInsideTabsPublic(),
          getInsideMetaPublic(),
        ]);
        if (!mounted) return;
        const active = (tabs || []).filter((t) => t.is_active);
        if (active.length > 0) {
          setInsideTabs(active);
          setActiveTabId(active[0].id);
        }
        if (meta) setInsideMeta(meta);
      } catch {
        // keep fallback content if API fails
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // === Parallax effect ===
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const section = chooseSectionRef.current;
      const bg = chooseBgRef.current;
      if (!section || !bg) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // distance from viewport center to section center (positive when section is below viewport)
      const dist = rect.top + rect.height / 2 - vh / 2;
      // move bg slower than scroll
      const offset = -dist * 0.18;
      bg.style.transform = `translate3d(0, ${offset}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  const toggleCulture = (id: string) =>
    setOpenCultureId((prev) => (prev === id ? "" : id));

  // === Touch / pointer swipe for the calc slider («Порахуйте вигоду»).
  //     Wheel-driven горизонтальний свайп тачпада вже обробляється у
  //     useEffect нижче (onWheel на section), тому тут вмикаємо лише
  //     pointer drag (миша / палець / тачпад натиснув-потягнув). ===
  const calcSliderSwipeRef = useSwipeable<HTMLDivElement>({
    onNext: () => {
      const last = COMPARE_SLIDES.length - 1;
      setActiveSlide((cur) => Math.min(last, cur + 1));
    },
    onPrev: () => {
      setActiveSlide((cur) => Math.max(0, cur - 1));
    },
    threshold: 50,
    enableWheel: false,
  });

  // === Scroll-lock slider — wheel inside the calc section paginates slides.
  //     Supports both VERTICAL (mouse wheel / vertical trackpad gesture) and
  //     HORIZONTAL (trackpad two-finger left/right swipe) — whichever axis
  //     dominates the wheel event is the one we use to drive pagination.
  //
  //     Activation logic (важливо!): як тільки користувач починає СКРОЛИТИ
  //     і секція займає більшу частину viewport (її центр у viewport-і ИЛИ
  //     заголовок проскролений до верху), wheel перехоплюється на пагінацію.
  //     На краях слайдера (перший / останній) колесо «звільняється» —
  //     користувач може скролити сторінку далі. ===
  useEffect(() => {
    const section = calcSectionRef.current;
    if (!section) return;

    let lock = false;     // throttle between slide changes
    let unlockTimer: number | null = null;
    let hAccum = 0;       // accumulated horizontal delta for swipe gestures
    let vAccum = 0;       // accumulated vertical delta — для дрібних подій тачпада
    let vDecayTimer: number | null = null;
    const H_THRESHOLD = 60;  // px of horizontal swipe required to flip a slide
    const V_THRESHOLD = 40;  // px of vertical scroll required to flip a slide

    const flip = (direction: 1 | -1) => {
      const cur = activeSlideRef.current;
      const last = COMPARE_SLIDES.length - 1;
      const next = Math.min(last, Math.max(0, cur + direction));
      if (next === cur) return false;
      setActiveSlide(next);
      lock = true;
      if (unlockTimer) window.clearTimeout(unlockTimer);
      unlockTimer = window.setTimeout(() => { lock = false; }, 750);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      // Section is "active" коли її центр у межах viewport (більш гнучко за
      // попередній strict-fullyVisible — працює на будь-яких висотах екрану,
      // включно з ноутами 13"-14" та великими 4K моніторами).
      const sectionCenter = rect.top + rect.height / 2;
      const isActive =
        rect.top <= vh * 0.25 &&  // верх секції вище 25% viewport
        rect.bottom >= vh * 0.5 && // низ секції нижче середини
        sectionCenter > 0 && sectionCenter < vh + rect.height; // sanity
      if (!isActive) {
        vAccum = 0;
        hAccum = 0;
        return;
      }

      const cur = activeSlideRef.current;
      const last = COMPARE_SLIDES.length - 1;

      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      const horizontalDominant = absX > absY && absX > 4;

      if (horizontalDominant) {
        // Horizontal trackpad swipe: accumulate so a single soft swipe
        // is enough to flip exactly one slide.
        if (lock) { e.preventDefault(); return; }
        hAccum += e.deltaX;
        if (Math.abs(hAccum) < H_THRESHOLD) {
          e.preventDefault();
          return;
        }
        const direction: 1 | -1 = hAccum > 0 ? 1 : -1;
        if ((direction < 0 && cur === 0) || (direction > 0 && cur === last)) {
          hAccum = 0;
          return;
        }
        e.preventDefault();
        flip(direction);
        hAccum = 0;
        return;
      }

      // Vertical wheel / vertical trackpad path.
      // Тачпад віддає дуже дрібні deltaY (~3–10px) — акумулюємо, щоб
      // навіть м'який скрол гарантовано перегортав слайди.
      const dirCheck = e.deltaY > 0 ? 1 : -1;
      // Boundary release — НЕ блокуємо скрол на краях слайдера, щоб
      // користувач не «застрягав» у секції.
      if (dirCheck < 0 && cur === 0) { vAccum = 0; return; }
      if (dirCheck > 0 && cur === last) { vAccum = 0; return; }

      e.preventDefault();
      if (lock) return;

      vAccum += e.deltaY;
      // decay акумулятора, якщо користувач "відпустив" жест
      if (vDecayTimer) window.clearTimeout(vDecayTimer);
      vDecayTimer = window.setTimeout(() => { vAccum = 0; }, 220);

      if (Math.abs(vAccum) < V_THRESHOLD) return;
      const direction: 1 | -1 = vAccum > 0 ? 1 : -1;
      vAccum = 0;
      flip(direction);
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      section.removeEventListener("wheel", onWheel as any);
      if (unlockTimer) window.clearTimeout(unlockTimer);
      if (vDecayTimer) window.clearTimeout(vDecayTimer);
    };
  }, []);

  const featureIcon = (name: string) => {
    if (name === "leaf") return <LeafIcon />;
    if (name === "drop") return <DropIcon />;
    return <CalendarIcon />;
  };

  return (
    <div className={styles.page} data-testid="cultures-page">
      <Seo
        title="Культури — Біорішення для зернових, бобових та технічних"
        description="Знайдіть оптимальне біорішення для своєї культури: пшениця, кукурудза, соя, соняшник, ріпак та інші. Bacillus thuringiensis, Trichoderma, азотфіксуючі бактерії."
        canonical="/cultures"
      />
      <Navbar1 device="Desktop" state="Default" size="20" size1="20" size2="16" />

      {/* ============ 1. HERO ============ */}
      <section className={styles.hero} data-testid="cultures-hero">
        <img decoding="async" className={styles.heroImg} src="/image@2x.webp" alt="" loading="eager" />
        <div className={styles.heroOverlay} />
        <div className={styles.breadcrumb}>
          <Link to="/" className={styles.breadcrumbLink}>Головна</Link>
          <span>/</span>
          <span className={styles.breadcrumbCurrent}>Культури</span>
        </div>
        <RevealHeading
          as="h1"
          className={styles.heroHeadline}
          baseDelay={150}
          stagger={90}
          block
          lineClassName={[styles.heroLine1, styles.heroLine2]}
          lines={[
            [{ text: "Ефективні рішення:" }],
            [{ text: "від поля до саду" }],
          ]}
          data-testid="cultures-hero-headline"
        />
      </section>

      {/* ============ 2. CHOOSE CULTURE ============ */}
      <section
        className={styles.chooseSection}
        data-testid="cultures-choose"
        ref={chooseSectionRef}
      >
        <img loading="lazy" decoding="async"
          className={styles.chooseBg}
          src="/41-2@2x.png"
          alt=""
          ref={chooseBgRef}
        />

        <div className={styles.chooseHead}>
          <RevealHeading
            as="h2"
            className={styles.chooseTitle}
            baseDelay={120}
            stagger={85}
            block
            lines={[
              [{ text: "Знайдіть рішення", className: styles.chooseTitleGrey }],
              [{ text: "для вашої культури", className: styles.chooseTitleBold }],
            ]}
            data-testid="cultures-choose-title"
          />

          <div className={styles.chooseHintRow}>
            <p className={styles.chooseHint}>
              <b>Оберіть культуру</b>
              <span> - ми покажемо перевірені препарати та схеми застосування</span>
            </p>
          </div>
        </div>

        <div className={styles.cardGroup} data-testid="cultures-cards">
          {loadingCultures ? (
            <div className={styles.cardsLoading}>Завантаження культур…</div>
          ) : cultures.length === 0 ? (
            <div className={styles.cardsEmpty}>
              Поки немає жодної культури. Додайте їх через адмінку.
            </div>
          ) : (
            cultures.map((c) => {
              const isOpen = openCultureId === c.id;
              return (
                <div
                  className={isOpen ? styles.cardOpen : styles.cardClosed}
                  data-testid={`culture-${c.slug}`}
                  key={c.id}
                >
                  <div
                    className={styles.cardHead}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Закрити «${c.title}»` : `Відкрити «${c.title}»`}
                    onClick={() => toggleCulture(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleCulture(c.id);
                      }
                    }}
                    data-testid={`toggle-${c.slug}`}
                  >
                    <h3 className={styles.cardTitle}>{c.title}</h3>
                    <span
                      className={styles.iconBtn}
                      aria-hidden="true"
                    >
                      {isOpen ? <MinusIcon /> : <PlusIcon />}
                    </span>
                  </div>

                  {isOpen && (
                    <>
                      <div className={styles.cardDivider} />
                      <div className={styles.cardBody}>
                        <div className={styles.cardLeftCol}>
                          {c.problem_text && (
                            <div className={styles.problemText}>{c.problem_text}</div>
                          )}

                          <div className={styles.cardTwoColInner}>
                            {c.treatment_types.length > 0 && (
                              <div className={styles.typeRow}>
                                <div className={styles.label}>Типи препаратів:</div>
                                <div className={styles.chipsRow}>
                                  {c.treatment_types.map((t) => (
                                    <span className={styles.chip} key={t}>
                                      <span className={styles.dot} />
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {c.effective_for.length > 0 && (
                              <div className={styles.efRow}>
                                <div className={styles.label}>Ефективно для:</div>
                                <div className={styles.tagRow}>
                                  {c.effective_for.map((x) => (
                                    <span className={styles.tag} key={x}>
                                      {x}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <Link
                            to={c.catalog_url || "/catalog"}
                            className={styles.viewLineBtn}
                            data-testid={`view-line-${c.slug}`}
                          >
                            {c.button_label || "Переглянути лінійку"} <ArrowRight />
                          </Link>
                        </div>

                        {c.image_url && (
                          <div className={styles.cardRightImage}>
                            <img loading="lazy" decoding="async"
                              className={styles.cardImg}
                              src={c.image_url}
                              alt={c.image_alt || c.title}
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ============ 3 + 4. CALC SECTION (1920×1463) ============
           Top 524px : cream bg, two-row heading
           Bottom 939: green field image with title + 2 metric cards + dots
           ============================================================ */}
      <section
        className={styles.calcSection}
        data-testid="cultures-calc-section"
        ref={calcSectionRef}
      >
        {/* ----- TOP : heading 524px ----- */}
        <div className={styles.calcTop}>
          <RevealHeading
            as="h2"
            className={styles.calcHeading}
            baseDelay={120}
            stagger={85}
            block
            lines={[
              [{ text: "Порахуйте вигоду", className: styles.calcLineBold }],
              [{ text: "переходу на біозахист", className: styles.calcLineLight }],
            ]}
            data-testid="cultures-counter-heading"
          />
        </div>

        {/* ----- BOTTOM : slider 1920×939 ----- */}
        <div
          className={styles.calcSlider}
          data-testid="cultures-slider"
          ref={calcSliderSwipeRef}
          style={{ touchAction: "pan-y", userSelect: "none" }}
        >
          {/* Slides stack — each slide absolute-positioned, animated via opacity */}
          {COMPARE_SLIDES.map((slide, idx) => {
            const isActive = idx === activeSlide;
            return (
              <div
                key={slide.id}
                className={`${styles.calcSlide} ${isActive ? styles.calcSlideActive : ""}`}
                data-testid={`slide-${slide.id}`}
                aria-hidden={!isActive}
              >
                <img loading="lazy" decoding="async"
                  className={styles.sliderBg}
                  src={slide.image}
                  alt={slide.title}
                />
                <div className={styles.sliderOverlay} />

                <h3 className={styles.slideTitle}>
                  {slide.title.toUpperCase()}
                </h3>

                <div className={styles.metricCardsRow}>
                  <div className={styles.metricCard} data-testid={`metric-card-chem-${idx}`}>
                    <span className={styles.metricCardLabel}>{slide.chem.name}</span>
                    {slide.chem.rows.map((r) => (
                      <div className={styles.metricStat} key={`${slide.id}-c-${r.label}`}>
                        <span className={styles.metricNum}>{r.num}</span>
                        <span className={styles.metricSub}>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.metricCard} data-testid={`metric-card-bio-${idx}`}>
                    <span className={styles.metricCardLabel}>{slide.bio.name}</span>
                    {slide.bio.rows.map((r) => (
                      <div className={styles.metricStat} key={`${slide.id}-b-${r.label}`}>
                        <span className={styles.metricNum}>{r.num}</span>
                        <span className={styles.metricSub}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dots — shared across slides */}
          <div className={styles.sliderDots} role="tablist" aria-label="Слайдер порівняння років">
            {COMPARE_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                className={`${styles.sliderDot} ${idx === activeSlide ? styles.sliderDotActive : ""}`}
                aria-label={`Слайд ${idx + 1}: ${slide.title}`}
                aria-selected={idx === activeSlide}
                role="tab"
                onClick={() => setActiveSlide(idx)}
                data-testid={`slider-dot-${idx}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ 5. WHY CHOOSE BIO (1920×1843) ============ */}
      <section className={styles.whyWrap} data-testid="cultures-why">
        <img loading="lazy" decoding="async" className={styles.whyVectorBg} src="/why-plant-vector.png" alt="" />

        <RevealHeading
          as="h2"
          className={styles.whyHeading}
          baseDelay={120}
          stagger={70}
          lines={[
            [
              { text: "Чому агрономи", className: styles.whyHeadCream },
              { text: "переходять на біопрепарати", className: styles.whyHeadGrey },
            ],
          ]}
          data-testid="cultures-why-heading"
        />

        <div className={styles.whyGrid}>
          {/* Top-left : lead paragraphs (NOT a card) */}
          <div className={styles.whyLead} data-testid="why-lead">
            <p className={styles.leadPara}>
              Продукція без залишків пестицидів{" "}
              <span className={styles.leadAccent}>відповідає нормам ЄС</span>{" "}
              та відкриває{" "}
              <span className={styles.leadAccent}>преміальні ринки збуту.</span>
            </p>
            <p className={styles.leadPara}>
              Чистий врожай ={" "}
              <span className={styles.leadAccent}>вища ціна закупки.</span>
            </p>
            <p className={styles.leadPara}>
              Біопідхід - не компроміс, а конкурентна перевага.
            </p>
          </div>

          {/* Top-right : Ефективність */}
          <div className={styles.whyCard} data-testid="why-card-efektyvnist">
            <div className={styles.whyCardCopy}>
              <h3 className={styles.whyCardTitle}>{WHY_CARDS[0].title}</h3>
              <p className={styles.whyCardText}>{WHY_CARDS[0].desc}</p>
            </div>
            <img
              loading="lazy"
              decoding="async"
              className={styles.whyCardImage}
              src={WHY_CARDS[0].image}
              alt=""
              aria-hidden="true"
            />
          </div>

          {/* Bottom-left : Ціна */}
          <div className={styles.whyCard} data-testid="why-card-cina">
            <div className={styles.whyCardCopy}>
              <h3 className={styles.whyCardTitle}>{WHY_CARDS[1].title}</h3>
              <p className={styles.whyCardText}>{WHY_CARDS[1].desc}</p>
            </div>
            <img
              loading="lazy"
              decoding="async"
              className={styles.whyCardImage}
              src={WHY_CARDS[1].image}
              alt=""
              aria-hidden="true"
            />
          </div>

          {/* Bottom-right : Застосування */}
          <div className={styles.whyCard} data-testid="why-card-zastosuvannya">
            <div className={styles.whyCardCopy}>
              <h3 className={styles.whyCardTitle}>{WHY_CARDS[2].title}</h3>
              <p className={styles.whyCardText}>{WHY_CARDS[2].desc}</p>
            </div>
            <img
              loading="lazy"
              decoding="async"
              className={styles.whyCardImage}
              src={WHY_CARDS[2].image}
              alt=""
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* ============ 6. INSIDE TABS ============ */}
      <section className={styles.insideWrap} data-testid="cultures-inside">
        <div className={styles.inside}>
          <div className={styles.insideLeft}>
            <h2 className={styles.insideTitle}>
              {insideMeta.title1}
              <br />
              <span className={styles.italic}>{insideMeta.title2}</span>
            </h2>
            <div
              className={styles.tabsGroup}
              data-count={insideTabs.length}
              role="tablist"
              aria-label="Зазирни всередину"
            >
              {insideTabs.map((t) => {
                const isActive = activeTabId === t.id;
                const activeStyle: React.CSSProperties =
                  isActive && t.accent_color
                    ? { background: t.accent_color, borderColor: t.accent_color }
                    : {};
                return (
                  <button
                    key={t.id}
                    className={`${styles.tab} ${isActive ? "" : styles.tabInactive}`}
                    onClick={() => setActiveTabId(t.id)}
                    data-testid={`tab-${t.slug}`}
                    role="tab"
                    aria-selected={isActive}
                    style={activeStyle}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className={styles.insideTextBlock} key={activeTabId}>
              {insideTabs.map((t) => {
                if (t.id !== activeTabId) return null;
                return (
                  <React.Fragment key={t.id}>
                    {t.title && (
                      <h3 className={styles.insideH2}>{t.title}</h3>
                    )}
                    <div className={styles.insideDesc}>
                      {(t.description || "").split(/\n+/).map((para, i) => (
                        <p key={i} className={styles.insideDescPara}>
                          {para}
                        </p>
                      ))}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className={styles.insideRight}>
            {insideTabs.map((t) => {
              const src = t.image_url || "/inside-bacillus.webp";
              const isActive = activeTabId === t.id;
              return (
                <img
                  key={t.id}
                  loading="lazy"
                  decoding="async"
                  className={`${styles.insideRightImg} ${
                    isActive ? styles.insideRightImgActive : ""
                  }`}
                  src={src}
                  alt={t.image_alt || t.label}
                  aria-hidden={!isActive}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 7. HOW IT WORKS ============ */}
      <section className={styles.howWrap} data-testid="cultures-how">
        <div className={styles.how}>
          <RevealHeading
            as="h2"
            className={styles.howTitle}
            baseDelay={120}
            stagger={80}
            lines={[
              [
                { text: "Як працюють" },
                { text: "біопрепарати?", className: styles.italic },
              ],
            ]}
            data-testid="cultures-how-title"
          />

          <div className={styles.timeline}>
            <div className={styles.tlLine} />
            <div className={styles.tlDot} />
          </div>

          <StepsList />
        </div>
      </section>

      {/* ============ 8. ICON FEATURES ============ */}
      <section className={styles.iconsWrap} data-testid="cultures-features">
        <div className={styles.iconsRow}>
          <div className={styles.iconCol}>
            <div className={styles.iconCircle}><img loading="lazy" decoding="async" src="/feature-leaf.png" alt="" /></div>
            <div className={styles.ftTextContent}>
              <h3 className={styles.iconColTitle}>100% органічно</h3>
              <div className={styles.iconColDesc}>Натуральні інгредієнти для сталого<br />сільського господарства</div>
            </div>
          </div>
          <div className={styles.iconCol}>
            <div className={styles.iconCircle}><img loading="lazy" decoding="async" src="/feature-drop.png" alt="" /></div>
            <div className={styles.ftTextContent}>
              <h3 className={styles.iconColTitle}>Легке застосування</h3>
              <div className={styles.iconColDesc}>Водорозчинні формули<br />для зручного використання</div>
            </div>
          </div>
          <div className={styles.iconCol}>
            <div className={styles.iconCircle}><img loading="lazy" decoding="async" src="/feature-calendar.png" alt="" /></div>
            <div className={styles.ftTextContent}>
              <h3 className={styles.iconColTitle}>Всі сезони</h3>
              <div className={styles.iconColDesc}>Ефективний на різних стадіях росту</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 9. CONSULTATION — cultures-specific "Не знайшли вашу культуру?" block
          (pixel-perfect Figma redesign with sunflower bg + cream gradient overlay) ============ */}
      <CulturesNotFoundCta />

      <Footer1 device="Desktop" />
    </div>
  );
};

export default Cultures;
