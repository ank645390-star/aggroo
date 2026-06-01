import React, { useEffect, useRef, useState } from "react";
import { searchCities, NPCity } from "../../lib/geo-api";
import styles from "./Autocomplete.module.css";

/* =====================================================================
   CityAutocomplete — вводимо назву міста, отримуємо випадаючий
   список реальних населених пунктів з API НП. При виборі повертає
   в колбек (city.name, city.ref).

   - debounce 220мс
   - клавіатурна навігація: ↑/↓/Enter/Esc
   - при click outside — закривається
   ===================================================================== */

type Props = {
  label?: string;
  value: string;
  onChange: (cityName: string, cityRef: string | null) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  testId?: string;
  disabled?: boolean;
};

const CityAutocomplete: React.FC<Props> = ({
  label, value, onChange, placeholder, error, required, testId, disabled,
}) => {
  const [items, setItems] = useState<NPCity[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // debounced fetch
  useEffect(() => {
    const q = value.trim();
    if (!q) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchCities(q, 12);
        if (!cancelled) {
          setItems(list);
          if (open) setActiveIdx(list.length ? 0 : -1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, open]);

  // click outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (c: NPCity) => {
    onChange(c.name, c.ref);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && items[activeIdx]) pick(items[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef} data-error={error ? "true" : "false"}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={styles.inputBox} data-disabled={disabled ? "true" : "false"}>
        <input
          type="text"
          className={styles.input}
          placeholder={placeholder || "Почніть вводити назву міста…"}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value, null);
            setOpen(true);
          }}
          onFocus={() => { if (value.trim()) setOpen(true); }}
          onKeyDown={onKeyDown}
          data-testid={testId}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-required={required ? "true" : undefined}
        />
        {loading && <span className={styles.spinner} aria-hidden="true" />}
      </div>
      {open && items.length > 0 && (
        <ul className={styles.dropdown} role="listbox" data-testid={`${testId}-dropdown`}>
          {items.map((c, i) => (
            <li
              key={c.ref + i}
              role="option"
              aria-selected={i === activeIdx}
              className={`${styles.option} ${i === activeIdx ? styles.optionActive : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              data-testid={`${testId}-opt-${i}`}
            >
              <span className={styles.optName}>{c.name}</span>
              <span className={styles.optMeta}>
                {c.settlement_type ? `${c.settlement_type} · ` : ""}{c.area || c.region}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && value.trim() && items.length === 0 && (
        <div className={styles.empty} role="status" data-testid={`${testId}-empty`}>
          Нічого не знайдено
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default CityAutocomplete;
