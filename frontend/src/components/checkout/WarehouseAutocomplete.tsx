import React, { useEffect, useRef, useState } from "react";
import { searchWarehouses, NPWarehouse } from "../../lib/geo-api";
import styles from "./Autocomplete.module.css";

/* =====================================================================
   WarehouseAutocomplete — список відділень НП у обраному місті.
   - Реальний фетч через /api/np/warehouses
   - Дизейблиться якщо cityRef порожній
   ===================================================================== */

type Props = {
  label?: string;
  cityRef: string;
  value: string;
  onChange: (warehouseLabel: string, ref: string | null, number: string | null) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  testId?: string;
};

const WarehouseAutocomplete: React.FC<Props> = ({
  label, cityRef, value, onChange, placeholder, error, required, testId,
}) => {
  const [items, setItems] = useState<NPWarehouse[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const disabled = !cityRef;

  useEffect(() => {
    if (!cityRef) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchWarehouses(cityRef, value.trim(), 30);
        if (!cancelled) {
          setItems(list);
          if (open) setActiveIdx(list.length ? 0 : -1);
        }
      } finally { if (!cancelled) setLoading(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [cityRef, value, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pick = (w: NPWarehouse) => {
    const label = `№${w.number} · ${w.short_address || w.description}`;
    onChange(label, w.ref, w.number);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
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
    } else if (e.key === "Escape") setOpen(false);
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
          placeholder={disabled ? "Спочатку виберіть місто" : (placeholder || "Номер або адреса відділення")}
          value={value}
          disabled={disabled}
          onChange={(e) => { onChange(e.target.value, null, null); setOpen(true); }}
          onFocus={() => { if (!disabled) setOpen(true); }}
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
          {items.map((w, i) => (
            <li
              key={w.ref + i}
              role="option"
              aria-selected={i === activeIdx}
              className={`${styles.option} ${i === activeIdx ? styles.optionActive : ""}`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(w); }}
              data-testid={`${testId}-opt-${i}`}
            >
              <span className={styles.optName}>№{w.number}</span>
              <span className={styles.optMeta}>{w.short_address || w.description}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
};

export default WarehouseAutocomplete;
