import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./BrandSelect.module.css";

/* =====================================================================
   BrandSelect — кастомний дропдаун, що замінює нативні `<select>`.

   Чому не нативний `<select>`:
   - Popup нативного селекту малюється ОС/браузером і його не можна
     застилізувати CSS. На скріні з адмінки видно типовий "OS green" фон
     виділеного пункту — це не наш бренд.
   - Кастомний компонент дає єдиний look-and-feel у всій адмінці й однаковий
     hover/selected/focus стан незалежно від платформи (mac/win/linux).

   Особливості:
   - API сумісне з нативним select: value + onChange(value).
   - Опції приймаються як масив `{value, label, disabled?}` АБО як children
     з `<option>` елементами (для drop-in заміни).
   - Підтримка клавіатури: ↑/↓/Home/End/Enter/Space/Esc/Tab.
   - Закривається на клік поза собою + Escape.
   - Рендерить попап у portal (document.body), щоб не обрізатись overflow:hidden
     батьківськими контейнерами адмінки (модалі, картки, табличні рядки).
   - Подія `onChange(value)` — лише value-рядок, як у нативного onChange.target.value.
   ===================================================================== */

export type BrandSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type BrandSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options?: BrandSelectOption[];
  /** Alternative: pass <option> children (drop-in replacement). */
  children?: React.ReactNode;
  className?: string;
  /** Inline css-module class injected for the trigger (e.g. styles.select). */
  triggerClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** `data-testid` passes through to the trigger button. */
  "data-testid"?: string;
  /** Width hint: 'auto' (default, fits content) or number (px) or any css length. */
  minWidth?: number | string;
  /** Розмір тригера: 'md' (default, 38px) або 'sm' (30px, для тулбарів). */
  size?: "sm" | "md";
};

/* Extract options from <option> children if `options` prop is not provided. */
const extractOptionsFromChildren = (
  children: React.ReactNode
): BrandSelectOption[] => {
  const out: BrandSelectOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    // Support <option> directly
    if (child.type === "option") {
      const props = child.props as any;
      out.push({
        value: String(props.value ?? ""),
        label:
          typeof props.children === "string"
            ? props.children
            : String(props.children ?? ""),
        disabled: !!props.disabled,
      });
    }
  });
  return out;
};

const ChevronIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
    style={{
      transition: "transform 0.18s ease",
      transform: open ? "rotate(180deg)" : "rotate(0)",
    }}
  >
    <path
      d="M3 4.5L6 7.5L9 4.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M2.5 6L5 8.5L9.5 3.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BrandSelect: React.FC<BrandSelectProps> = ({
  value,
  onChange,
  options: optionsProp,
  children,
  className = "",
  triggerClassName = "",
  placeholder = "",
  disabled = false,
  ariaLabel,
  minWidth,
  size = "md",
  ...rest
}) => {
  const options = useMemo<BrandSelectOption[]>(() => {
    if (optionsProp && optionsProp.length) return optionsProp;
    return extractOptionsFromChildren(children);
  }, [optionsProp, children]);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    const i = options.findIndex((o) => o.value === value);
    return i >= 0 ? i : 0;
  });
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const listId = useId();

  const currentLabel = useMemo(() => {
    const opt = options.find((o) => o.value === value);
    return opt ? opt.label : placeholder;
  }, [options, value, placeholder]);

  /* Sync activeIndex when popup opens — focus the current value */
  useEffect(() => {
    if (open) {
      const i = options.findIndex((o) => o.value === value);
      setActiveIndex(i >= 0 ? i : 0);
    }
  }, [open, options, value]);

  /* Compute portal position relative to trigger. */
  const updatePos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + window.scrollY + 4,
      left: r.left + window.scrollX,
      width: r.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePos]);

  /* Close on outside click / Escape. */
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        listRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Scroll active option into view + focus the list on open. */
  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.focus();
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!options.length) return;
      let next = activeIndex;
      for (let i = 0; i < options.length; i++) {
        next = (next + delta + options.length) % options.length;
        if (!options[next]?.disabled) break;
      }
      setActiveIndex(next);
    },
    [activeIndex, options]
  );

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
      return;
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) {
        onChange(opt.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleSelect = (opt: BrandSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  /* The portal needs document — guarded for SSR. */
  const canPortal = typeof window !== "undefined" && typeof document !== "undefined";

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}
         style={minWidth !== undefined ? { minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth } : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={[
          styles.trigger,
          size === "sm" ? styles.triggerSm : "",
          triggerClassName,
          open ? styles.triggerOpen : "",
          disabled ? styles.triggerDisabled : "",
        ].filter(Boolean).join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        data-testid={rest["data-testid"]}
      >
        <span className={[styles.label, !options.find(o => o.value === value) ? styles.labelPlaceholder : ""].filter(Boolean).join(" ")}>
          {currentLabel || placeholder || "\u00A0"}
        </span>
        <span className={styles.chevron} aria-hidden="true">
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && canPortal && pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            className={styles.menu}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              minWidth: pos.width,
            }}
            onKeyDown={handleListKeyDown}
          >
            {options.map((opt, idx) => {
              const selected = opt.value === value;
              const active = idx === activeIndex;
              return (
                <li
                  key={`${opt.value}-${idx}`}
                  data-index={idx}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={opt.disabled || undefined}
                  className={[
                    styles.option,
                    selected ? styles.optionSelected : "",
                    active ? styles.optionActive : "",
                    opt.disabled ? styles.optionDisabled : "",
                  ].filter(Boolean).join(" ")}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // prevent trigger blur before click registers
                    e.preventDefault();
                  }}
                  onClick={() => handleSelect(opt)}
                >
                  <span className={styles.optionLabel}>{opt.label}</span>
                  {selected && (
                    <span className={styles.optionCheck} aria-hidden="true">
                      <CheckIcon />
                    </span>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className={styles.empty} aria-disabled="true">
                Немає опцій
              </li>
            )}
          </ul>,
          document.body
        )}
    </div>
  );
};

export default BrandSelect;
