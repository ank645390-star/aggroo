import React, { useCallback, useEffect, useRef, useState } from "react";
import Seo from "../components/Seo";
import Navbar1 from "../components/figma/navbar1";
import Footer1 from "../components/figma/footer1";
import CtaSection1 from "../components/figma/cta-section1";
import LogisticsSection from "../components/figma/logistics-section";
import TrustSection from "../components/welcome/frame-component10";
import AnimatedNumber from "../components/about/animated-number";
import RevealHeading from "../components/welcome/reveal-heading";
import { useSwipeable } from "../lib/use-swipeable";
import cardStyles from "../components/welcome/number-card1.module.css";
import styles from "./about.module.css";

/* =====================================================================
   /about — "Про нас" page for TAMIS АГРО.
   Implements the full Figma design (1920 design width).
   Header (Navbar1) and Footer (Footer1) are not modified.
   Sections (top → bottom):
     1. Hero (agrovideo background + headline)
     2. Numbers (+350 тис / 100% / +5000)
     3. Mission (green block with quote & founder)
     4. "Від лабораторії до вашого поля" — 4 cards 01-04
     5. "Логістика живих рішень" — dark teal w/ plant photo
     6. "+20 років" history timeline (2000-2025)
     7. "Нам довіряють" — partners' logos
     8. "Не знайшли ваш препарат?" (reused CtaSection1)
   ===================================================================== */

/* --------------------------------------------------------------------
   NUMBERS — step-based per-digit slot-machine counter.
   Логіка повністю перенесена 1:1 з Welcome (frame-component8.tsx),
   щоб одна імплементація працювала всюди.
   "350 ТИС +" та "5000 +" — покрокова анімація з cascade middle 4→5
   на останньому кроці. "100 %" — статичне.
   Цифри: масив "reels" — кожен reel це послідовність кадрів (length=1
   для статичних). Анімація прокручується одночасно для всіх трьох
   карток (синхронізовано один phase-machine).
-------------------------------------------------------------------- */

type DigitSequence = string[];

type NumberCard = {
  key: string;
  digits: DigitSequence[];
  label?: string;
  showPlus: boolean;
  desc: string;
  accent: boolean;
};

const NUMBERS: NumberCard[] = [
  {
    key: "ha",
    digits: [
      ["3"],
      ["4", "4", "4", "5"],
      ["7", "8", "9", "0"],
    ],
    label: "ТИС",
    showPlus: true,
    desc: "гектарів оброблених полів по всій Україні",
    accent: true,
  },
  {
    key: "soil",
    digits: [["1"], ["0"], ["0"]],
    label: "%",
    showPlus: false,
    desc: "покращення стану ґрунту після застосування",
    accent: false,
  },
  {
    key: "farmers",
    digits: [
      ["4", "4", "4", "5"],
      ["9", "9", "9", "0"],
      ["9", "9", "9", "0"],
      ["7", "8", "9", "0"],
    ],
    showPlus: true,
    desc: "задоволених фермерів, які обрали нашу продукцію",
    accent: false,
  },
];

/* Timing — ідентично Welcome (frame-component8.tsx). */
const RESET_MS = 60;        // snap-reset (no transition)
const INITIAL_HOLD = 600;   // hold першого кадру перед першим роллом
const ROLL_MS = 320;        // smooth roll between two adjacent frames
const HOLD_BETWEEN = 450;   // hold після кожного проміжного кроку
const FINAL_HOLD = 1900;    // hold фінального значення перед reset

const LAB_CARDS = [
  {
    num: "01",
    title: "Розробка",
    desc:
      "Кожен препарат починається з дослідження.\nНаша лабораторія тестує штами бактерій та підбирає оптимальну концентрацію під реальні польові умови.",
    img: "/lab-research.webp",
  },
  {
    num: "02",
    title: "Виробництво",
    desc:
      "Живі організми вирощуються в контрольованому середовищі. Кожна партія проходить 3 етапи перевірки якості перед тим, як потрапити на склад.",
    img: "/lab-production.webp",
  },
  {
    num: "03",
    title: "Зберігання +5-10 °C",
    desc:
      "Біопрепарати — живі. Ми контролюємо температуру на кожному етапі: від виробництва до вашого складу. Це те, що конкуренти не роблять.",
    img: "/lab-storage.webp",
  },
  {
    num: "04",
    title: "Доставка",
    desc:
      "Термологістика до вашого поля.\nПрепарат приїжджає живим — і працює на повну з першої обробки.",
    img: "/Frame-1200@2x.webp",
  },
];

const TIMELINE_PERIODS = [
  {
    id: "2000",
    label: "Ідея",
    title: "Ідея",
    desc:
      "Народження концепції. Перші лабораторні дослідження штамів корисних бактерій та грибів — закладаємо фундамент майбутніх біопрепаратів задовго до офіційного запуску компанії.",
    img: "/history-lab.webp",
    icon: "/year-icon-2000.webp",
  },
  {
    id: "2005",
    label: "2005",
    title: "Заснування компанії",
    desc:
      "Офіційне заснування ТАМІС АГРО. Комерціалізуємо багаторічні розробки — запускаємо лінійку біоінокулянтів для зернових та бобових. Перші фермери довіряють нашій технології.",
    img: "/history-lab.webp",
    icon: "/year-icon-2005.webp",
  },
  {
    id: "2010",
    label: "2010",
    title: "Масштабування виробництва",
    desc:
      "Власне виробництво з холодильними камерами. Контрольована термологістика на кожному етапі — від штаму до поля клієнта.",
    img: "/lab-production.webp",
    icon: "/year-icon-2010.webp",
  },
  {
    id: "2015",
    label: "2015",
    title: "Міжнародні стандарти",
    desc:
      "Отримання сертифікацій якості. Виходимо на нові регіони України та налагоджуємо партнерства з провідними агрохолдингами.",
    img: "/lab-research.webp",
    icon: "/year-icon-2015.webp",
  },
  {
    id: "2020",
    label: "2020",
    title: "Технології та Сервіс",
    desc:
      "Комплексні рішення. Запуск власного агроконсалтингу. Ми перестали просто продавати препарати — ми почали продавати технологію вирощування «під ключ».",
    img: "/history-lab.webp",
    icon: "/year-icon-2020.webp",
  },
  {
    id: "2025",
    label: "2025",
    title: "Лідерство в галузі",
    desc:
      "Понад 5000 задоволених фермерів та 350+ тис. оброблених гектарів. Продовжуємо розробляти нові штами та цифрові інструменти моніторингу.",
    img: "/lab-storage.webp",
    icon: "/year-icon-2025.webp",
  },
];

/* Lab cards count (see LAB_CARDS array above). All other animation
   constants live inside the About component (snap-lock pattern). */

const About: React.FC = () => {
  // History/timeline interactive state — defaults to "2005" period (idx 1).
  const [activePeriodIdx, setActivePeriodIdx] = useState(1);
  const activePeriod = TIMELINE_PERIODS[activePeriodIdx];

  // Mobile detector — tracked via matchMedia(<=768px). Used to:
  //   • skip the scroll-driven LAB cards animation
  //   • disable hover-to-change on timeline
  //   • render mobile carousel arrows under the history card
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  // History carousel helpers (mobile only — under card)
  const periodsCount = TIMELINE_PERIODS.length;
  const goPrevPeriod = () =>
    setActivePeriodIdx((i) => (i - 1 + periodsCount) % periodsCount);
  const goNextPeriod = () =>
    setActivePeriodIdx((i) => (i + 1) % periodsCount);

  // Swipe / drag для блоку історії — пальцем по картці або
  // тачпадом горизонтально. Працює і на desktop, і на mobile.
  const historySwipeRef = useSwipeable<HTMLDivElement>({
    onNext: goNextPeriod,
    onPrev: goPrevPeriod,
    threshold: 50,
  });

  // -------------------------------------------------------------------
  // Step-based slot-machine counter (перенесено 1:1 з Welcome /
  // frame-component8.tsx). Глобальний "step" індекс синхронно тягне
  // всі reels до targetIndex=step. Статичні reels (length=1) ігнорують
  // step. "+" з'являється fade-in одночасно з фінальним роллом.
  // Phase cycle:
  //   tick 0: snap reset (60ms)
  //   tick 1: hold 600ms       (показуємо "347" / "4997")
  //   tick 2: roll 320+450ms   (→ "348" / "4998")
  //   tick 3: roll 320+450ms   (→ "349" / "4999")
  //   tick 4: roll 320ms + "+" fade-in + hold 1900ms (→ "350+" / "5000+")
  //   loop
  // -------------------------------------------------------------------
  const numbersRef = useRef<HTMLDivElement | null>(null);
  const [numbersStarted, setNumbersStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState(true);
  const [showPlus, setShowPlus] = useState(false);

  // Trigger on viewport entry.
  useEffect(() => {
    const el = numbersRef.current;
    if (!el || numbersStarted) return;
    if (!("IntersectionObserver" in window)) {
      setNumbersStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setNumbersStarted(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [numbersStarted]);

  // Step-based phase machine — мирорує Welcome 1:1.
  useEffect(() => {
    if (!numbersStarted) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const at = (ms: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const startCycle = () => {
      if (cancelled) return;
      // 1. SNAP RESET
      setSnap(true);
      setShowPlus(false);
      setStep(0);

      at(RESET_MS, () => {
        setSnap(false);
        // 2. HOLD INITIAL
        at(INITIAL_HOLD, () => {
          // 3. ROLL → step 1
          setStep(1);
          at(ROLL_MS + HOLD_BETWEEN, () => {
            // 4. ROLL → step 2
            setStep(2);
            at(ROLL_MS + HOLD_BETWEEN, () => {
              // 5. ROLL → step 3 (FINAL) + "+" fade-in одночасно
              setStep(3);
              setShowPlus(true);
              // 6. ЗУПИНКА на фінальному значенні (без loop).
              //    Анімація запускається одноразово при вході в viewport.
            });
          });
        });
      });
    };

    startCycle();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [numbersStarted]);

  // ----------------- LAB section: snap-lock scroll-jack -----------------
  // Поведінка (по аналогії з welcome HowItWorksSection1 "Технологія Врожаю"):
  //   • Коли блок наближається до центру viewport — JS жорстко snap-it scrollY
  //     у точку snap-center і входить у режим lock.
  //   • У lock усі wheel/touch перехоплюються (preventDefault), кожен снап
  //     перемикає активну картку 01 → 02 → 03 → 04 (або назад).
  //   • Картка-наступник «підіймається знизу», попередня — «йде вгору».
  //   • На крайній картці накопичується overshoot, після порогу — exit lock.
  // -----------------------------------------------------------------------
  const N_LAB = LAB_CARDS.length;
  const LAB_SLIDE_PX = 760;
  const LAB_WHEEL_THRESHOLD = 40;
  const LAB_SNAP_LOCK_MS = 550;
  const LAB_ENTRY_TOLERANCE = 220;
  const LAB_EXIT_OVERSHOOT = 220;
  const LAB_EXIT_COOLDOWN = 1500;

  const labSectionRef = useRef<HTMLElement | null>(null);
  const labCardsRef = useRef<HTMLDivElement[]>([]);
  const [labActiveIdx, setLabActiveIdx] = useState(0);
  const [labLocked, setLabLocked] = useState(false);

  const labActiveIdxRef = useRef(0);
  const labLockedRef = useRef(false);
  const labLockedScrollRef = useRef(0);
  const labAccumRef = useRef(0);
  const labOvershootRef = useRef(0);
  const labLockUntilRef = useRef(0);
  const labExitUntilRef = useRef(0);
  const labLastScrollYRef = useRef(0);

  useEffect(() => {
    labActiveIdxRef.current = labActiveIdx;
  }, [labActiveIdx]);
  useEffect(() => {
    labLockedRef.current = labLocked;
  }, [labLocked]);

  // Apply transforms to lab cards based on active index.
  // Mobile uses smaller slide-distance (80px) so the swap feels snappier
  // on short viewport — exact mirror of welcome HowItWorksSection1.
  useEffect(() => {
    const slideY = isMobile ? 80 : LAB_SLIDE_PX;
    labCardsRef.current.forEach((el, i) => {
      if (!el) return;
      if (i === labActiveIdx) {
        el.style.transform = "translate3d(0, 0, 0)";
        el.style.opacity = "1";
        el.style.zIndex = "50";
        el.style.pointerEvents = "auto";
      } else if (i > labActiveIdx) {
        el.style.transform = `translate3d(0, ${slideY}px, 0)`;
        el.style.opacity = "0";
        el.style.zIndex = String(10 + i);
        el.style.pointerEvents = "none";
      } else {
        el.style.transform = `translate3d(0, -${slideY}px, 0)`;
        el.style.opacity = "0";
        el.style.zIndex = String(10 + i);
        el.style.pointerEvents = "none";
      }
    });
  }, [labActiveIdx, isMobile]);

  /* MOBILE only — resize the deck (.labCardDeck) to match the natural
     height of the currently active card. Eliminates the dead-space gap
     between the image and the description text on cards with shorter
     copy (e.g. "Зберігання"). Smoothly animated via CSS transition.
     ResizeObserver re-measures when fonts load / viewport rotates. */
  useEffect(() => {
    if (!isMobile) return;
    const active = labCardsRef.current[labActiveIdx];
    if (!active) return;
    const deck = active.parentElement as HTMLElement | null;
    if (!deck) return;

    const sync = () => {
      const h = active.scrollHeight;
      if (h > 0) deck.style.height = `${h}px`;
    };
    sync();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => sync());
      ro.observe(active);
    }
    const onWindowResize = () => sync();
    window.addEventListener("resize", onWindowResize);
    window.addEventListener("orientationchange", onWindowResize);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      window.removeEventListener("orientationchange", onWindowResize);
    };
  }, [labActiveIdx, isMobile]);

  // Compute the document scrollY that centers the lab section in viewport.
  const computeLabSnapTarget = useCallback((): number => {
    const sec = labSectionRef.current;
    if (!sec) return window.scrollY;
    const r = sec.getBoundingClientRect();
    const sectionDocTop = r.top + window.scrollY;
    const vh = window.innerHeight;
    return sectionDocTop + r.height / 2 - vh / 2;
  }, []);

  const enterLabLock = useCallback(
    (initialIdx: number) => {
      if (labLockedRef.current) return;
      const target = computeLabSnapTarget();
      labLockedScrollRef.current = target;
      window.scrollTo({ top: target, behavior: "auto" });
      labAccumRef.current = 0;
      labOvershootRef.current = 0;
      labLockUntilRef.current = Date.now() + 200;
      setLabActiveIdx(initialIdx);
      setLabLocked(true);
    },
    [computeLabSnapTarget]
  );

  const exitLabLock = useCallback((dir: "down" | "up") => {
    if (!labLockedRef.current) return;
    setLabLocked(false);
    labAccumRef.current = 0;
    labOvershootRef.current = 0;
    labExitUntilRef.current = Date.now() + LAB_EXIT_COOLDOWN;
    const sec = labSectionRef.current;
    if (sec) {
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const shift =
        dir === "down" ? r.height / 2 + vh / 2 + 1 : -(r.height / 2 + vh / 2 + 1);
      window.scrollBy({ top: shift, behavior: "auto" });
    }
  }, []);

  // Scroll listener — checks whether to enter lock, holds scroll while locked.
  useEffect(() => {
    if (isMobile) return;
    labLastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const cur = window.scrollY;
      const prev = labLastScrollYRef.current;
      const dir: "down" | "up" = cur > prev ? "down" : "up";
      labLastScrollYRef.current = cur;

      if (labLockedRef.current) {
        if (Math.abs(cur - labLockedScrollRef.current) > 1) {
          window.scrollTo({ top: labLockedScrollRef.current, behavior: "auto" });
        }
        return;
      }

      const sec = labSectionRef.current;
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const blockCenter = r.top + r.height / 2;
      const vhCenter = vh / 2;
      const delta = Math.abs(blockCenter - vhCenter);

      if (delta < LAB_ENTRY_TOLERANCE) {
        if (Date.now() < labExitUntilRef.current) return;
        const initial = dir === "down" ? 0 : N_LAB - 1;
        enterLabLock(initial);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enterLabLock, isMobile, N_LAB]);

  // Wheel / touch — active only while locked.
  useEffect(() => {
    if (isMobile) return;

    const trySnap = (dir: 1 | -1): boolean => {
      const cur = labActiveIdxRef.current;
      const now = Date.now();
      if (now < labLockUntilRef.current) return false;
      if (dir > 0 && cur < N_LAB - 1) {
        setLabActiveIdx(cur + 1);
        labAccumRef.current = 0;
        labOvershootRef.current = 0;
        labLockUntilRef.current = now + LAB_SNAP_LOCK_MS;
        return true;
      }
      if (dir < 0 && cur > 0) {
        setLabActiveIdx(cur - 1);
        labAccumRef.current = 0;
        labOvershootRef.current = 0;
        labLockUntilRef.current = now + LAB_SNAP_LOCK_MS;
        return true;
      }
      return false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!labLockedRef.current) return;
      e.preventDefault();
      const cur = labActiveIdxRef.current;
      const dy = e.deltaY;
      const now = Date.now();
      if (now < labLockUntilRef.current) return;

      if (dy > 0) {
        if (cur < N_LAB - 1) {
          labAccumRef.current += dy;
          if (labAccumRef.current >= LAB_WHEEL_THRESHOLD) trySnap(1);
        } else {
          labOvershootRef.current += dy;
          if (labOvershootRef.current >= LAB_EXIT_OVERSHOOT) exitLabLock("down");
        }
      } else if (dy < 0) {
        if (cur > 0) {
          labAccumRef.current += dy;
          if (labAccumRef.current <= -LAB_WHEEL_THRESHOLD) trySnap(-1);
        } else {
          labOvershootRef.current += dy;
          if (labOvershootRef.current <= -LAB_EXIT_OVERSHOOT) exitLabLock("up");
        }
      }
    };

    // Touch support — analogous accumulation
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!labLockedRef.current) return;
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!labLockedRef.current) return;
      e.preventDefault();
      const cur = labActiveIdxRef.current;
      const y = e.touches[0]?.clientY ?? 0;
      const dy = touchStartY - y;
      const now = Date.now();
      if (now < labLockUntilRef.current) return;
      if (Math.abs(dy) < 30) return;
      touchStartY = y;
      if (dy > 0) {
        if (cur < N_LAB - 1) trySnap(1);
        else {
          labOvershootRef.current += dy;
          if (labOvershootRef.current >= LAB_EXIT_OVERSHOOT) exitLabLock("down");
        }
      } else {
        if (cur > 0) trySnap(-1);
        else {
          labOvershootRef.current += dy;
          if (labOvershootRef.current <= -LAB_EXIT_OVERSHOOT) exitLabLock("up");
        }
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("wheel", onWheel as any);
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
    };
  }, [exitLabLock, isMobile, N_LAB]);

  /* ---------------------------------------------------------------------
   * MOBILE LAB section: local scroll-lock driver — port 1:1 з
   * welcome/how-it-works-section1.tsx (effect lines 108-342).
   * Поведінка ідентична "Технології врожаю" на мобільному:
   *   • Коли top секції наближається до header (band ≤ 80px) при scroll-DOWN
   *     → активується LOCK, сторінка перестає прокручуватись.
   *   • Кожен swipe-up / wheel-down → activeIdx++ (01→02→03→04).
   *   • На крайній картці (idx=3) ще один свайп вниз → exit lock, сторінка
   *     йде далі. Дзеркально вгору на idx=0.
   *   • Зворотній (up) scroll крізь секцію — natural, без повторного lock.
   *   • Programmatic-jump (>250px за RAF) — bypass lock.
   * Десктоп використовує інший effect (вже існує, isMobile?return).
   * ------------------------------------------------------------------- */
  useEffect(() => {
    if (!isMobile) return;
    const sec = labSectionRef.current;
    if (!sec) return;

    const SWIPE_TH = 45;
    const WHEEL_TH = 30;
    const SNAP_COOLDOWN_MS = 480;
    const ENTRY_BAND_PX = 80;
    const HEADER_OFFSET = 60;

    let mLocked = false;
    let mLockedScrollY = 0;
    let mNextSnapAt = 0;
    let mPassedDown = false;
    let mTouchY = 0;
    let mTouchX = 0;
    let mIntent: "v" | "h" | null = null;
    let mWheelAccum = 0;
    let mScrollRAF = 0;

    const applyLockedState = (v: boolean) => {
      mLocked = v;
      labLockedRef.current = v;
      setLabLocked(v);
    };

    const enterLock = (fromTop: boolean) => {
      if (mLocked) return;
      const r = sec.getBoundingClientRect();
      const targetTop = Math.max(0, window.scrollY + r.top - HEADER_OFFSET);
      window.scrollTo({ top: targetTop, behavior: "auto" });
      mLockedScrollY = window.scrollY;
      mNextSnapAt = Date.now() + 120;
      mWheelAccum = 0;
      setLabActiveIdx(fromTop ? 0 : N_LAB - 1);
      applyLockedState(true);
    };

    const exitLockLocal = (down: boolean) => {
      if (!mLocked) return;
      applyLockedState(false);
      mWheelAccum = 0;
      if (down) {
        mPassedDown = true;
        const r = sec.getBoundingClientRect();
        const after = window.scrollY + r.bottom - HEADER_OFFSET + 4;
        window.scrollTo({ top: Math.max(0, after), behavior: "auto" });
      } else {
        const r = sec.getBoundingClientRect();
        const before = window.scrollY + r.top - window.innerHeight + 4;
        window.scrollTo({ top: Math.max(0, before), behavior: "auto" });
      }
    };

    const trySnap = (dir: 1 | -1): "snap" | "exit" | "cooldown" => {
      if (Date.now() < mNextSnapAt) return "cooldown";
      const cur = labActiveIdxRef.current;
      if (dir > 0) {
        if (cur < N_LAB - 1) {
          setLabActiveIdx(cur + 1);
          mNextSnapAt = Date.now() + SNAP_COOLDOWN_MS;
          return "snap";
        }
        return "exit";
      }
      if (cur > 0) {
        setLabActiveIdx(cur - 1);
        mNextSnapAt = Date.now() + SNAP_COOLDOWN_MS;
        return "snap";
      }
      return "exit";
    };

    let mLastScrollY = window.scrollY;
    const onScroll = () => {
      if (mScrollRAF) cancelAnimationFrame(mScrollRAF);
      mScrollRAF = requestAnimationFrame(() => {
        const cur = window.scrollY;
        const delta = cur - mLastScrollY;
        const goingDown = delta > 0;
        const isJump = Math.abs(delta) > 250;
        mLastScrollY = cur;

        if (mLocked) {
          if (Math.abs(cur - mLockedScrollY) > 1) {
            window.scrollTo({ top: mLockedScrollY, behavior: "auto" });
          }
          return;
        }
        if (isJump) {
          const r = sec.getBoundingClientRect();
          if (r.bottom < 0) mPassedDown = true;
          return;
        }
        const r = sec.getBoundingClientRect();
        if (r.top > window.innerHeight + 100) {
          mPassedDown = false;
        }
        if (!goingDown) return;
        if (mPassedDown) return;
        const topRelHeader = r.top - HEADER_OFFSET;
        if (topRelHeader <= ENTRY_BAND_PX && topRelHeader >= -ENTRY_BAND_PX) {
          enterLock(true);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onWheel = (e: WheelEvent) => {
      if (!mLocked) return;
      e.preventDefault();
      if (Date.now() < mNextSnapAt) return;
      const dy = e.deltaY;
      if (dy > 0) {
        mWheelAccum = mWheelAccum > 0 ? mWheelAccum + dy : dy;
        if (mWheelAccum >= WHEEL_TH) {
          mWheelAccum = 0;
          const r = trySnap(1);
          if (r === "exit") exitLockLocal(true);
        }
      } else if (dy < 0) {
        mWheelAccum = mWheelAccum < 0 ? mWheelAccum + dy : dy;
        if (mWheelAccum <= -WHEEL_TH) {
          mWheelAccum = 0;
          const r = trySnap(-1);
          if (r === "exit") exitLockLocal(false);
        }
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    const onTouchStart = (e: TouchEvent) => {
      mTouchY = e.touches[0].clientY;
      mTouchX = e.touches[0].clientX;
      mIntent = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!mLocked) return;
      const yNow = e.touches[0].clientY;
      const xNow = e.touches[0].clientX;
      const dy = mTouchY - yNow;
      const dx = mTouchX - xNow;
      if (mIntent === null) {
        if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
        mIntent = Math.abs(dx) > Math.abs(dy) * 1.3 ? "h" : "v";
      }
      if (mIntent === "h") return;
      e.preventDefault();
      if (Date.now() < mNextSnapAt) return;
      if (dy >= SWIPE_TH) {
        const r = trySnap(1);
        if (r === "snap" || r === "cooldown") {
          mTouchY = yNow;
        } else if (r === "exit") {
          exitLockLocal(true);
        }
      } else if (dy <= -SWIPE_TH) {
        const r = trySnap(-1);
        if (r === "snap" || r === "cooldown") {
          mTouchY = yNow;
        } else if (r === "exit") {
          exitLockLocal(false);
        }
      }
    };
    const onTouchEnd = () => {
      mIntent = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (!mLocked) return;
      if (
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Spacebar"
      ) {
        e.preventDefault();
        const r = trySnap(1);
        if (r === "exit") exitLockLocal(true);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const r = trySnap(-1);
        if (r === "exit") exitLockLocal(false);
      }
    };
    window.addEventListener("keydown", onKey);

    requestAnimationFrame(() => onScroll());

    return () => {
      if (mScrollRAF) cancelAnimationFrame(mScrollRAF);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKey);
    };
  }, [isMobile, N_LAB]);

  return (
    <div className={styles.page} data-testid="about-page">
      <Seo
        title="Про нас — Не просто продаємо препарати"
        description="ТАМІС АГРО — український виробник живих біопрепаратів. +20 років історії, від лабораторних досліджень до повного циклу: розробка, виробництво, зберігання та доставка."
        canonical="/about"
        image="/agrovideo-1@2x.webp"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "Про ТАМІС АГРО",
          inLanguage: "uk",
          url: "https://tamis-agro.ua/about",
        }}
      />
      {/* ===== Header (unchanged) ===== */}
      <Navbar1 device="Desktop" state="Default" size="20" size1="20" size2="16" />

      {/* ============ 1. HERO ============ */}
      <section className={styles.heroWrap}>
        <div className={styles.hero}>
          {/* Hero animation: lightweight MP4/WebM (1MB vs 16MB animated PNG).
              `agrovideo-1@2x.webp` залишено як poster/fallback. */}
          <video
            className={styles.heroBg}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster="/agrovideo-1@2x.webp"
            aria-hidden="true"
          >
            <source src="/agrovideo-1.webm" type="video/webm" />
            <source src="/agrovideo-1.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroInner}>
            <RevealHeading
              as="h1"
              className={styles.heroTitle}
              data-testid="about-hero-title"
              baseDelay={100}
              stagger={80}
              block
              lines={[[{ text: "не просто продаємо препарати" }]]}
            />
            <RevealHeading
              as="h2"
              className={styles.heroSubtitle}
              baseDelay={100 + 4 * 80}
              stagger={80}
              block
              lines={[[{ text: "Ми повертаємо землі силу" }]]}
            />
          </div>
        </div>
      </section>

      {/* ============ 2. NUMBERS ============ */}
      <section className={styles.numbersWrap} data-testid="about-numbers">
        <div className={styles.numbersInner} ref={numbersRef}>
          <div className={styles.numbersRow}>
            {NUMBERS.map((n) => {
              const finalValue =
                n.digits.map((d) => d[d.length - 1]).join("") +
                (n.label ? ` ${n.label}` : "") +
                (n.showPlus ? "+" : "");
              return (
                <div className={styles.numberCard} key={n.key}>
                  <div
                    className={`${styles.numberCardLine} ${
                      n.accent ? styles.numberCardLineAccent : ""
                    }`}
                  />
                  <div className={styles.numberCardContent}>
                    <h2
                      className={`${styles.numberCardTitle} ${
                        n.accent ? styles.numberCardTitleAccent : ""
                      }`}
                      data-testid={`about-num-${n.key}`}
                      aria-label={finalValue}
                    >
                      <span className={cardStyles.statRow}>
                        <span
                          className={cardStyles.digits}
                          aria-hidden="true"
                        >
                          {n.digits.map((d, i) => {
                            const isStatic = d.length === 1;
                            const targetIndex = isStatic
                              ? 0
                              : Math.min(step, d.length - 1);
                            return (
                              <AnimatedNumber
                                key={i}
                                sequence={d}
                                targetIndex={targetIndex}
                                snap={snap || isStatic}
                                rollMs={ROLL_MS}
                              />
                            );
                          })}
                        </span>
                        {n.label && (
                          <span
                            className={cardStyles.statLabel}
                            aria-hidden="true"
                          >
                            {n.label}
                          </span>
                        )}
                        {n.showPlus && (
                          <span
                            className={cardStyles.statPlus}
                            style={{
                              opacity: showPlus ? 1 : 0,
                              transition: snap
                                ? "none"
                                : `opacity ${ROLL_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
                            }}
                            aria-hidden="true"
                          >
                            +
                          </span>
                        )}
                      </span>
                    </h2>
                    <h3 className={styles.numberCardDesc}>{n.desc}</h3>
                  </div>
                </div>
              );
            })}
          </div>
          <div className={styles.numbersHr} />
        </div>
      </section>

      {/* ============ 3. MISSION ============ */}
      <section className={styles.missionWrap} data-testid="about-mission">
        <div className={styles.mission}>
          <img loading="lazy" decoding="async"
            className={styles.missionLeafBg}
            src="/anna-50943-A-green-leaf-puzzle-piece-clicking-into-place-comple-1a20d17d-b582-43eb-9096-247f63b56145-Photoroom-1@2x.webp"
            alt=""
          />
          <RevealHeading
            as="h2"
            className={styles.missionTitle}
            baseDelay={100}
            stagger={70}
            lines={[
              [
                { text: "Ціна помилки в агро — не просто цифри у звіті." },
                {
                  text: "Це здоров’я землі на роки вперед.",
                  className: styles.missionTitleAccent,
                },
              ],
            ]}
          />
          <div className={styles.missionRow}>
            <img loading="lazy" decoding="async"
              className={styles.missionLeafImg}
              src="/close-up-green-leaf-with-water-drops-1@2x.webp"
              alt=""
              width={732}
              height={915}
            />
            <div className={styles.missionTextCol}>
              <div className={styles.missionTextTop}>
                <RevealHeading
                  as="h3"
                  className={styles.missionLead}
                  baseDelay={100}
                  stagger={45}
                  block
                  lines={[
                    [
                      {
                        text:
                          "Хімія дає ілюзію швидкості, часто ціною опіків та виснаження ґрунту.",
                      },
                    ],
                  ]}
                />
                <div className={styles.missionStatement}>
                  <RevealHeading
                    as="h2"
                    className={styles.missionStatementTitle}
                    baseDelay={100}
                    stagger={60}
                    lines={[[{ text: "Наша місія" }]]}
                  />
                  <div className={styles.missionStatementBody}>
                    <RevealHeading
                      as="p"
                      className={styles.missionStatementText}
                      baseDelay={150}
                      stagger={28}
                      block
                      lines={[
                        [
                          {
                            text:
                              "шлях без компромісів: ми інтегруємо мікробіологію в існуючі технології так, щоб ви отримали і рекордний врожай, і чистий продукт з високою ринковою цінністю.",
                          },
                        ],
                      ]}
                    />
                    <RevealHeading
                      as="p"
                      className={styles.missionStatementText}
                      baseDelay={250}
                      stagger={28}
                      block
                      lines={[
                        [
                          {
                            text:
                              "Біопрепарати сьогодні - найрозумніша інвестиція в землю та життя майбутнього покоління.",
                          },
                        ],
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.missionAuthor}>
                <RevealHeading
                  as="h3"
                  className={styles.missionAuthorName}
                  baseDelay={100}
                  stagger={55}
                  lines={[[{ text: "Михайло Севастьянов" }]]}
                />
                <RevealHeading
                  as="h4"
                  className={styles.missionAuthorRole}
                  baseDelay={150}
                  stagger={45}
                  lines={[[{ text: "Засновник & власник" }]]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 4. LAB → FIELD ============ */}
      <section className={styles.labWrap} data-testid="about-lab" ref={labSectionRef}>
        <div className={styles.labInner}>
          <div className={styles.labCardTrack}>
            <div className={styles.labCardStage}>
              <h2 className={styles.labTitle}>
                <span className={styles.labTitleAccent}>Від лабораторії </span>
                до вашого поля
              </h2>
              <div className={styles.labCardDeck}>
                {LAB_CARDS.map((c, idx) => (
                  <div
                    className={styles.labCard}
                    key={c.num}
                    ref={(el) => {
                      if (el) labCardsRef.current[idx] = el;
                    }}
                  >
                    <div className={styles.labCardLeft}>
                      <h3 className={styles.labCardNumber}>{c.num}</h3>
                      <div className={styles.labCardContent}>
                        <h4 className={styles.labCardSubtitle}>{c.title}</h4>
                        <p className={styles.labCardDesc}>{c.desc}</p>
                      </div>
                    </div>
                    <img loading="lazy" decoding="async" className={styles.labCardImg} src={c.img} alt="" />
                  </div>
                ))}
              </div>
              {/* Dot indicator (clickable for accessibility) */}
              <div className={styles.labDots} role="tablist" aria-label="Етапи виробництва">
                {LAB_CARDS.map((c, idx) => (
                  <button
                    key={c.num}
                    type="button"
                    role="tab"
                    aria-selected={idx === labActiveIdx}
                    aria-label={`Етап ${c.num}: ${c.title}`}
                    onClick={() => setLabActiveIdx(idx)}
                    className={`${styles.labDot} ${idx === labActiveIdx ? styles.labDotActive : ""}`}
                    data-testid={`lab-dot-${idx}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 5. LOGISTICS (reused from Welcome) ============ */}
      <section data-testid="about-logistics">
        <LogisticsSection />
      </section>

      {/* ============ 6. HISTORY ============ */}
      <section className={styles.historyWrap} data-testid="about-history">
        <div className={styles.historyInner}>
          <div className={styles.historyHeader}>
            <RevealHeading
              as="h2"
              className={styles.historyTitle}
              baseDelay={100}
              stagger={80}
              block
              lines={[[{ text: "+20 років" }]]}
            />
            <RevealHeading
              as="h3"
              className={styles.historySubtitle}
              baseDelay={100 + 2 * 80}
              stagger={80}
              block
              lines={[[{ text: "нашої історії ефективності" }]]}
            />
          </div>

          <div
            className={styles.historyCard}
            ref={historySwipeRef}
            style={{ touchAction: "pan-y", userSelect: "none" }}
          >
            <img loading="lazy" decoding="async"
              key={activePeriod.id}
              className={styles.historyCardImage}
              src={activePeriod.img}
              alt={activePeriod.title}
              draggable={false}
            />
            <div className={styles.historyCardText}>
              <h3 className={styles.historyCardTitle}>{activePeriod.title}</h3>
              <p className={styles.historyCardDesc}>{activePeriod.desc}</p>
            </div>
          </div>

          {/* Sunflower timeline */}
          <div className={styles.timelineWrap}>
            {/* Vertical connector — 108 × 1px line linking the active card
                to the active sunflower below it. Slides horizontally on
                period change. Position formula matches flex space-between:
                center_i = 70px + i * (100% - 140px) / 5  (n=6, icon=140) */}
            <span
              className={styles.timelineConnector}
              aria-hidden="true"
              style={{
                left: `calc(${activePeriodIdx} * (100% - 140px) / 5 + 70px)`,
              }}
            />
            <div className={styles.timelineLine} aria-hidden="true" />
            <ul className={styles.timelineRow} role="tablist">
              {TIMELINE_PERIODS.map((p, idx) => {
                const isActive = idx === activePeriodIdx;
                return (
                  <li key={p.id} className={styles.timelineItem}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`${p.id} — ${p.title}`}
                      data-testid={`history-period-${p.id}`}
                      className={
                        isActive
                          ? `${styles.timelineIcon} ${styles.timelineIconActive}`
                          : styles.timelineIcon
                      }
                      onClick={() => setActivePeriodIdx(idx)}
                      onMouseEnter={isMobile ? undefined : () => setActivePeriodIdx(idx)}
                    >
                      <img loading="lazy" decoding="async"
                        src={p.icon}
                        alt={`${p.id} — ${p.title}`}
                        draggable={false}
                      />
                    </button>
                    <span
                      className={
                        isActive
                          ? `${styles.timelineYearLabel} ${styles.timelineYearLabelActive}`
                          : styles.timelineYearLabel
                      }
                    >
                      {p.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Mobile-only carousel arrows for history (timeline hidden via CSS) */}
          <div className={styles.historyArrows} aria-hidden={isMobile ? "false" : "true"}>
            <button
              type="button"
              className={styles.historyArrowBtn}
              onClick={goPrevPeriod}
              aria-label="Попередній період"
              data-testid="history-carousel-prev"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M14 5L8 11L14 17" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.historyArrowsCenter}>
              <img
                src={activePeriod.icon}
                alt=""
                className={styles.historyArrowsIcon}
                aria-hidden="true"
                draggable={false}
              />
              <span className={styles.historyArrowsYear} data-testid="history-carousel-year">
                {activePeriod.label}
              </span>
            </div>
            <button
              type="button"
              className={styles.historyArrowBtn}
              onClick={goNextPeriod}
              aria-label="Наступний період"
              data-testid="history-carousel-next"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <path d="M8 5L14 11L8 17" stroke="#1B4332" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ============ 7. TRUST (reused from Welcome) ============ */}
      <section data-testid="about-trust">
        <TrustSection />
      </section>

      {/* ============ 8. CTA (reused) ============ */}
      <CtaSection1 />

      {/* ===== Footer (unchanged) ===== */}
      <Footer1 device="Desktop" />
    </div>
  );
};

export default About;
