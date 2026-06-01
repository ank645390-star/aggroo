import React from "react";
import styles from "./animated-number.module.css";

export type AnimatedNumberProps = {
  /** Послідовність значень: перший — стартовий, останній — фінальний.
   *  Рендериться як вертикальна колонка; reel плавно прокручується знизу-вгору. */
  sequence: (string | number)[];
  /** На якому індексі має зупинитись reel: 0 — стартова позиція, last — фінал. */
  targetIndex: number;
  /** Якщо true — прибираємо transition, щоб миттєво стрибнути в targetIndex
   *  (використовуємо для «reset» між циклами). */
  snap?: boolean;
  /** Тривалість одного прокрутування у мс (smooth ease-out). */
  rollMs?: number;
  /** Текст, що йде після цифр (напр. " тис +" або " +"). */
  suffix?: string;
  /** Чи показувати suffix зараз. Має фейдитись синхронно з тим, як reel
   *  досягає фінального значення. */
  showSuffix?: boolean;
  /** Додатковий клас на root. */
  className?: string;
};

/**
 * Smooth odometer-style number reel. Все слайдиться одним continuous
 * translateY-transition: жодних стрибків, жодних фейдів окремих кадрів.
 * Контрольний компонент — батько керує phase-машиною.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  sequence,
  targetIndex,
  snap = false,
  rollMs = 2200,
  suffix = "",
  showSuffix = true,
  className = "",
}) => {
  const safeLen = Math.max(1, sequence.length);
  const clamped = Math.max(0, Math.min(targetIndex, safeLen - 1));
  // 100 / N — частка від загальної висоти .reelInner на одну комірку.
  const cellPct = 100 / safeLen;
  const offsetPct = clamped * cellPct;

  return (
    <span className={`${styles.root} ${className}`} data-testid="anim-number">
      <span className={styles.reel} aria-hidden="true">
        <span
          className={styles.reelInner}
          style={{
            transform: `translate3d(0, -${offsetPct}%, 0)`,
            transition: snap
              ? "none"
              : `transform ${rollMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          {sequence.map((v, i) => (
            <span key={i} className={styles.reelCell}>
              {v}
            </span>
          ))}
        </span>
      </span>
      {/* SR-friendly final value */}
      <span className={styles.srOnly}>
        {String(sequence[sequence.length - 1])}
        {suffix}
      </span>
      {suffix ? (
        <span
          className={styles.suffix}
          style={{
            opacity: showSuffix ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {suffix}
        </span>
      ) : null}
    </span>
  );
};

export default AnimatedNumber;
