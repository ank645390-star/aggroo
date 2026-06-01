import React from "react";
import Minus1 from "./minus1";
import Plus1 from "./plus1";
import styles from "./counter1.module.css";

export type Counter1Type = {
  className?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  size?: any;
  size1?: any;
};

const Counter1: React.FC<Counter1Type> = ({
  className = "",
  value,
  onChange,
  min = 1,
  max = 999,
  size = 20,
  size1 = 20,
}) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const handleDec = () => onChange(clamp(value - 1));
  const handleInc = () => onChange(clamp(value + 1));

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      onChange(min);
      return;
    }
    onChange(clamp(parseInt(raw, 10)));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === "" || isNaN(parseInt(e.target.value, 10))) {
      onChange(min);
    }
  };

  return (
    <div className={[styles.counter, className].join(" ")}>
      <button
        type="button"
        className={styles.btn}
        onClick={handleDec}
        disabled={value <= min}
        aria-label="Зменшити"
      >
        <Minus1 size={size} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        className={styles.input}
        value={value}
        onChange={handleInput}
        onBlur={handleBlur}
        aria-label="Кількість"
      />
      <button
        type="button"
        className={styles.btn}
        onClick={handleInc}
        disabled={value >= max}
        aria-label="Збільшити"
      >
        <Plus1 size={size1} />
      </button>
    </div>
  );
};

export default Counter1;
