import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./frame-component9.module.css";

export type FrameComponent9Type = {
  className?: string;
};

/**
 * Chevron icon (left / right). Точна копія дизайну з Figma:
 *   - viewBox 0 0 37 37
 *   - path Chevron Right: M14.592 26.8804 L 23.04 18.4324 L 14.592 9.98438
 *   - stroke #1B4332, stroke-width 4.608, stroke-linecap square
 *   - Розмір рендера: 36.86 × 36.86 (як у дизайні)
 *   - Ліва стрілка — та сама іконка, відзеркалена горизонтально
 */
const ArrowIcon: React.FC<{ dir: "left" | "right" }> = ({ dir }) => (
  <svg
    width="36.86"
    height="36.86"
    viewBox="0 0 37 37"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={dir === "left" ? { transform: "scaleX(-1)" } : undefined}
  >
    <path
      d="M14.592 26.8804L23.04 18.4324L14.592 9.98438"
      stroke="#1B4332"
      strokeWidth="4.608"
      strokeLinecap="square"
    />
  </svg>
);

/**
 * Before/After slider:
 *  - bottom layer  → GOOD corn (always behind)
 *  - top layer     → BAD corn (clipped from the right side by clip-path)
 *  - divider line + circular handle move horizontally with progress (0..100)
 *  - default progress = 80% — мatches the original static composition
 *    (bad ~80% width on left + good ~20% strip on right)
 *  - drag the handle → progress changes; releasing keeps the value
 *  - clicking anywhere on the image also moves the handle to that point
 */
const FrameComponent9: React.FC<FrameComponent9Type> = ({ className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  // Простий 0..100 діапазон. Слайдер ходить по всій ширині контейнера.
  // Default = 50 → середина (як на референсі від користувача).
  const [progress, setProgress] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
    }
    animFrameRef.current = requestAnimationFrame(() => {
      setProgress(pct);
      animFrameRef.current = null;
    });
  }, []);

  const beginDrag = useCallback(
    (clientX: number) => {
      draggingRef.current = true;
      setIsDragging(true);
      updateFromClientX(clientX);
    },
    [updateFromClientX]
  );

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientX(e.clientX);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [updateFromClientX, endDrag]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    beginDrag(e.clientX);
  };

  const onContainerPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest(`.${styles.handle}`)) return;
    beginDrag(e.clientX);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setProgress((p) => Math.max(0, p - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setProgress((p) => Math.min(100, p + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setProgress(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setProgress(100);
    }
  };

  return (
    <div className={[styles.frameWrapper, className].join(" ")}>
      <div className={styles.chemicalElementsParent}>
        <section className={styles.chemicalElements}>
          <div className={styles.text}>
            <h1 className={styles.h1}>
              Хімічні ЗЗР: <br />
              знищення
            </h1>
            <div className={styles.div}>
              <b>Хімічні елементи</b>
              <span>
                {` `}діють миттєво, але{` `}
              </span>
              <b>вбивають життя в ґрунті.</b>
              <span>
                 Знищують шкідника сьогодні, але залишають <br />
                токсичний слід,{` `}
              </span>
              <b>руйнують мікрофлору</b>
              <span>
                {` і `}змушують рослину звикати до отрут. <br />З кожним роком
                дозування доводиться збільшувати, а{` `}
              </span>
              <b>врожайність падає.</b>
              <span>
                {" "}
                <br />
                {`Як наслідок ґрунт погіршується. `}
              </span>
            </div>
          </div>
        </section>
        <div className={styles.imageWrapper}>
          <div
            ref={containerRef}
            className={`${styles.image} ${isDragging ? styles.imageDragging : ""}`}
            onPointerDown={onContainerPointerDown}
            role="presentation"
          >
            {/* Layer 1 — good cob (база, завжди під низом) */}
            <div className={styles.layerGood} aria-hidden="true" />

            {/* Layer 2 — bad cob (AI-парна копія), клипається від правого краю */}
            <div
              className={`${styles.layerBad} ${isDragging ? styles.noTransition : ""}`}
              style={{ clipPath: `inset(0 ${(100 - progress).toFixed(3)}% 0 0)` }}
              aria-hidden="true"
            />

            {/* Divider + Handle: ходить 0..100 на всю ширину */}
            <div
              className={`${styles.compareSlider} ${isDragging ? styles.noTransition : ""}`}
              style={{ left: `${progress.toFixed(3)}%` }}
            >
              <div className={styles.line} />
              <button
                type="button"
                className={styles.handle}
                onPointerDown={onHandlePointerDown}
                onKeyDown={onHandleKeyDown}
                aria-label="Перетягніть, щоб порівняти результат"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                role="slider"
              >
                <div className={styles.icons}>
                  <ArrowIcon dir="left" />
                  <ArrowIcon dir="right" />
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className={styles.bioPreparationsWrapper}>
          <div className={styles.text}>
            <h1 className={styles.h1}>
              Біопрепарати: <br />
              відновлення
            </h1>
            <div className={styles.div2}>
              <b>Біопрепарати</b>
              <span>
                {` `}не труять, а заселяють ґрунт корисними бактеріями, які самі
                захищають коріння та живлять рослину. Ефект накопичується: що
                довше ви їх використовуєте, то{` `}
              </span>
              <b>родючішою стає земля і стабільнішим - врожай.</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameComponent9;
