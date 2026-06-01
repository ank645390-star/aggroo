import { useEffect, useRef } from "react";

/**
 * useSwipeable — універсальний хук для додавання swipe / drag
 * жестів (touch + pointer / тачпад жест свайпом) поверх будь-якого
 * елемента-слайдера.
 *
 * Підтримує:
 *  - touch swipe (телефон / планшет)
 *  - pointer drag мишею (натиснули → потягнули → відпустили)
 *  - тачпад двопальцевий горизонтальний свайп (wheel deltaX) —
 *    окремий шлях, бо браузери НЕ генерують pointer-події для
 *    жесту прокрутки. Якщо у користувача "natural scroll", знак
 *    deltaX все одно правильний (вправо → деталь > 0 → next).
 *
 * Сигнатура:
 *   const ref = useSwipeable<HTMLDivElement>({
 *     onNext: () => ...,
 *     onPrev: () => ...,
 *     threshold: 50,
 *   });
 *
 *   <div ref={ref} ... />
 *
 * Хук НЕ змінює DOM (крім cursor у style). Логіку слайдера лишаємо
 * у компоненті — він просто отримує onNext/onPrev.
 */
export type UseSwipeableOptions = {
  onNext?: () => void;
  onPrev?: () => void;
  /** мінімальна довжина свайпу (px), за замовч. 50 */
  threshold?: number;
  /** мінімальна довжина wheel-свайпу тачпадом (px), за замовч. 60 */
  wheelThreshold?: number;
  /** false → pointer drag вимкнено (тільки touch + wheel) */
  enablePointer?: boolean;
  /** false → wheel свайп вимкнено (тільки drag) */
  enableWheel?: boolean;
  /** додатковий guard — викликати, чи дозволено зараз свайпати */
  enabled?: () => boolean;
};

export function useSwipeable<T extends HTMLElement>(opts: UseSwipeableOptions) {
  const ref = useRef<T | null>(null);
  const stateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    pointerId: -1,
    wheelAccum: 0,
    wheelLockUntil: 0,
  });

  // Зберігаємо callbacks у ref, щоб не пересоздавати слухачі при ре-рендерах.
  const cbRef = useRef(opts);
  useEffect(() => {
    cbRef.current = opts;
  }, [opts]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const threshold = cbRef.current.threshold ?? 50;
    const wheelThreshold = cbRef.current.wheelThreshold ?? 60;

    /* CRITICAL: read enabled() from cbRef.current AT CALL TIME, not at
       mount. The `enabled` callback typically closes over component state
       (e.g., `total > 1`) which is 0 at mount when async data hasn't
       arrived yet. Always read the freshest opts at gesture time. */
    const isEnabled = () => {
      const enabled = cbRef.current.enabled;
      return enabled ? enabled() : true;
    };
    const isPointerDisabled = () => cbRef.current.enablePointer === false;
    const isWheelDisabled = () => cbRef.current.enableWheel === false;

    // ---------- POINTER (touch + mouse + pen) ----------
    const onPointerDown = (e: PointerEvent) => {
      if (isPointerDisabled()) return;
      if (!isEnabled()) return;
      // Ігноруємо клік на інтерактивних елементах всередині
      const t = e.target as HTMLElement | null;
      if (
        t &&
        t.closest(
          'button, a, input, textarea, select, [role="button"], [role="slider"], [data-no-swipe]'
        )
      ) {
        return;
      }
      // mouse тільки лівою кнопкою
      if (e.pointerType === "mouse" && e.button !== 0) return;

      // Запобігаємо native image drag (браузер починає "drag image"
      // на mousedown по <img>, і ми не отримаємо pointermove).
      if (t && t.tagName === "IMG") {
        e.preventDefault();
      }

      stateRef.current.active = true;
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.lastX = e.clientX;
      stateRef.current.pointerId = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      s.lastX = e.clientX;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      // Якщо рух більше горизонтальний — забороняємо вертикальний скрол
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const finishPointer = (e: PointerEvent) => {
      const s = stateRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;
      const dx = s.lastX - s.startX;
      s.active = false;
      s.pointerId = -1;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (Math.abs(dx) >= threshold) {
        if (dx < 0) cbRef.current.onNext?.();
        else cbRef.current.onPrev?.();
      }
    };

    // ---------- WHEEL (тачпад горизонтальний свайп) ----------
    const onWheel = (e: WheelEvent) => {
      if (isWheelDisabled()) return;
      if (!isEnabled()) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      // Реагуємо тільки на яскраво виражений ГОРИЗОНТАЛЬНИЙ жест.
      if (absX < 4 || absX <= absY) return;
      const now = performance.now();
      const s = stateRef.current;
      if (now < s.wheelLockUntil) {
        e.preventDefault();
        return;
      }
      s.wheelAccum += e.deltaX;
      if (Math.abs(s.wheelAccum) < wheelThreshold) {
        e.preventDefault();
        return;
      }
      const dir = s.wheelAccum > 0 ? 1 : -1;
      s.wheelAccum = 0;
      s.wheelLockUntil = now + 600;
      e.preventDefault();
      if (dir > 0) cbRef.current.onNext?.();
      else cbRef.current.onPrev?.();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", finishPointer);
    el.addEventListener("pointercancel", finishPointer);
    el.addEventListener("wheel", onWheel, { passive: false });
    // Disable native browser image drag inside our container — інакше
    // браузер починає "drag image" і ми не отримуємо pointermove.
    const onDragStart = (e: Event) => e.preventDefault();
    el.addEventListener("dragstart", onDragStart);

    // ---------- TOUCH FALLBACK (mobile-specific) ----------
    // On some mobile browsers (older iOS Safari, embedded webviews), pointer
    // events for touch don't fire reliably for fast horizontal swipes when
    // touchAction is non-default. We add explicit touchstart/move/end as a
    // belt-and-suspenders fallback so finger swipe always works.
    let tStartX = 0;
    let tStartY = 0;
    let tLastX = 0;
    let tActive = false;
    const onTouchStartT = (e: TouchEvent) => {
      if (!isEnabled()) return;
      const tEl = e.target as HTMLElement | null;
      if (
        tEl &&
        tEl.closest(
          'button, a, input, textarea, select, [role="button"], [role="slider"], [data-no-swipe]'
        )
      ) {
        return;
      }
      const t = e.touches[0];
      if (!t) return;
      tStartX = t.clientX;
      tStartY = t.clientY;
      tLastX = t.clientX;
      tActive = true;
    };
    const onTouchMoveT = (e: TouchEvent) => {
      if (!tActive) return;
      const t = e.touches[0];
      if (!t) return;
      tLastX = t.clientX;
      const dx = t.clientX - tStartX;
      const dy = t.clientY - tStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        if (e.cancelable) e.preventDefault();
      }
    };
    const onTouchEndT = () => {
      if (!tActive) return;
      tActive = false;
      const dx = tLastX - tStartX;
      if (Math.abs(dx) >= threshold) {
        if (dx < 0) cbRef.current.onNext?.();
        else cbRef.current.onPrev?.();
      }
    };
    el.addEventListener("touchstart", onTouchStartT, { passive: true });
    el.addEventListener("touchmove", onTouchMoveT, { passive: false });
    el.addEventListener("touchend", onTouchEndT, { passive: true });
    el.addEventListener("touchcancel", onTouchEndT, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove as any);
      el.removeEventListener("pointerup", finishPointer);
      el.removeEventListener("pointercancel", finishPointer);
      el.removeEventListener("wheel", onWheel as any);
      el.removeEventListener("dragstart", onDragStart);
      el.removeEventListener("touchstart", onTouchStartT as any);
      el.removeEventListener("touchmove", onTouchMoveT as any);
      el.removeEventListener("touchend", onTouchEndT);
      el.removeEventListener("touchcancel", onTouchEndT);
    };
  }, []);

  return ref;
}

export default useSwipeable;
