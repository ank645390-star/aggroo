import React, { useEffect, useRef, useState } from "react";
import AnimatedNumber from "../about/animated-number";
import styles from "./frame-component8.module.css";
import cardStyles from "./number-card1.module.css";

export type FrameComponent8Type = {
  className?: string;
};

/* --------------------------------------------------------------------
   Числовий блок «350 ТИС + / 100% / 5000 +» з ПОКРОКОВОЮ
   slot-machine анімацією.

   Логіка для "350+":
     • "3" — завжди статична
     • "4" — статична, але в момент переходу last-9→0 змінюється на 5
       (sequence ["4","4","4","5"] — reel рухається ТІЛЬКИ на останньому кроці)
     • "7→8→9→0" — остання цифра прокручується покроково
     • "+" — з'являється ТІЛЬКИ після того як reels дійшли до фіналу

   Аналогічно "5000+":
     ["4","4","4","5"] · ["9","9","9","0"] · ["9","9","9","0"] · ["7","8","9","0"]

   "100%" — повністю статичне.

   КРОКОВА фаза-машина (одна для всіх 3-х карточок, synchronously):
     Tick 0: reset (snap to index 0, без анімації)          [60ms]
     Tick 1: показуємо index 0 = "347", "4997"               [600ms hold]
     Tick 2: roll → index 1 = "348", "4998"  (320ms roll + 450ms hold)
     Tick 3: roll → index 2 = "349", "4999"  (320ms roll + 450ms hold)
     Tick 4: roll → index 3 = "350", "5000"  (320ms roll + 280ms reveal-delay)
     Tick 5: "+" fade-in, hold                              [1900ms]
     → loop
-------------------------------------------------------------------- */

type DigitSequence = string[];

type NumberCard = {
  key: string;
  digits: DigitSequence[];
  label?: string;
  showPlus: boolean;
  digitColor: string;
  labelColor?: string;
  description: string;
  cardWidth: string;
  accentBorder: string;
};

const ITEMS: NumberCard[] = [
  {
    key: "ha",
    digits: [
      ["3"],
      ["4", "4", "4", "5"],
      ["7", "8", "9", "0"],
    ],
    label: "ТИС",
    showPlus: true,
    digitColor: "#b3d217",
    labelColor: "#b3d217",
    description: "гектарів оброблених полів по всій Україні",
    cardWidth: "478px",
    accentBorder: "#b3d217",
  },
  {
    key: "soil",
    digits: [["1"], ["0"], ["0"]],
    label: "%",
    showPlus: false,
    digitColor: "#2c2c27",
    labelColor: "#2c2c27",
    description: "покращення стану ґрунту після застосування ",
    cardWidth: "435px",
    accentBorder: "#93928c",
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
    digitColor: "#2c2c27",
    labelColor: "#2c2c27",
    description: "задоволених фермерів, які обрали нашу продукцію",
    cardWidth: "447px",
    accentBorder: "#93928c",
  },
];

// Timing
const RESET_MS = 60;        // snap-reset (no transition)
const INITIAL_HOLD = 600;   // hold "347" / "4997" перед першим роллом
const ROLL_MS = 320;        // smooth roll від одного кадру до наступного
const HOLD_BETWEEN = 450;   // hold після кожного проміжного кроку
const FINAL_HOLD = 1900;    // hold "350+" перед reset

const FrameComponent8: React.FC<FrameComponent8Type> = ({ className = "" }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);

  // Глобальний "step" індекс, який синхронно тягне всі reels до targetIndex=step.
  // Динамічні reels мають довжину 4 → step ∈ {0,1,2,3}.
  // Статичні (length=1) ігнорують step та завжди показують index 0.
  const [step, setStep] = useState(0);
  // snap=true → CSS transition вимкнено (instant jump).
  const [snap, setSnap] = useState(true);
  // showPlus → fade-in "+" в кінці циклу.
  const [showPlus, setShowPlus] = useState(false);

  // Trigger on viewport entry.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || started) return;
    if (!("IntersectionObserver" in window)) {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [started]);

  // Step-based phase machine.
  useEffect(() => {
    if (!started) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const at = (ms: number, fn: () => void) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const startCycle = () => {
      if (cancelled) return;

      // ── 1. SNAP RESET ──────────────────────────────────────────
      setSnap(true);
      setShowPlus(false);
      setStep(0);

      // Дамо React'у застосувати snap=true, потім вмикаємо transitions
      // та починаємо покрокову анімацію.
      at(RESET_MS, () => {
        setSnap(false);

        // ── 2. HOLD INDEX 0 ("347" / "4997") ─────────────────────
        at(INITIAL_HOLD, () => {
          // ── 3. ROLL TO INDEX 1 ("348" / "4998") ────────────────
          setStep(1);

          at(ROLL_MS + HOLD_BETWEEN, () => {
            // ── 4. ROLL TO INDEX 2 ("349" / "4999") ──────────────
            setStep(2);

            at(ROLL_MS + HOLD_BETWEEN, () => {
              // ── 5. ROLL TO INDEX 3 ("350" / "5000")  ───────────
              //    Cascade: last 9→0, AND middle 4→5 одночасно.
              //    "+" з'являється ОДНОЧАСНО з last roll (без затримки).
              setStep(3);
              setShowPlus(true);

              // ── 6. ЗУПИНКА на фінальному значенні (без loop) ────
              //    Анімація стартує одноразово при вході у viewport
              //    і застигає на "350 ТИС +" / "5000 +".
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
  }, [started]);

  return (
    <div
      className={[styles.numberSectionWrapper, className].join(" ")}
      ref={wrapRef}
      data-testid="welcome-numbers"
    >
      <div className={styles.numberSection}>
        <div className={styles.numberCards}>
          {ITEMS.map((item) => {
            const finalValue =
              item.digits.map((d) => d[d.length - 1]).join("") +
              (item.label ? ` ${item.label}` : "") +
              (item.showPlus ? "+" : "");

            return (
              <div
                className={cardStyles.numberCard}
                style={{ width: item.cardWidth }}
                key={item.key}
                data-testid={`welcome-num-${item.key}`}
              >
                <div
                  className={cardStyles.numberCardChild}
                  style={{ borderRight: `2px solid ${item.accentBorder}` }}
                />
                <div className={cardStyles.content}>
                  <h2
                    className={cardStyles.h2}
                    style={{ color: item.digitColor }}
                    aria-label={finalValue}
                  >
                    <span className={cardStyles.statRow}>
                      <span className={cardStyles.digits} aria-hidden="true">
                        {item.digits.map((d, i) => {
                          const isStatic = d.length === 1;
                          // step ∈ {0,1,2,3}; для статичних завжди 0.
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
                      {item.label && (
                        <span
                          className={cardStyles.statLabel}
                          style={{ color: item.labelColor || item.digitColor }}
                          aria-hidden="true"
                        >
                          {item.label}
                        </span>
                      )}
                      {item.showPlus && (
                        <span
                          className={cardStyles.statPlus}
                          style={{
                            color: item.labelColor || item.digitColor,
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
                  <h3 className={cardStyles.h3}>{item.description}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FrameComponent8;
