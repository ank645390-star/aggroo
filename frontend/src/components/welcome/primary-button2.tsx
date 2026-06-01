import React from "react";
import ArrowRight1 from "./arrow-right1";
import styles from "./primary-button2.module.css";

export type PrimaryButton2Type = {
  className?: string;
  showLabel?: boolean;
  size2?: any;

  /** Variant props */
  state?: any;
  type?: any;

  /** Behaviour */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  ariaLabel?: string;
};

const PrimaryButton2: React.FC<PrimaryButton2Type> = ({
  className = "",
  state = "Default",
  type = "Filled",
  showLabel = true,
  size2 = 24,
  onClick,
  ariaLabel,
}) => {
  const handle = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Card is wrapped in a <Link to="/product"> — don't navigate when adding
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);
  };

  return (
    <button
      type="button"
      className={[styles.primaryButton, className].join(" ")}
      data-state={state}
      data-type={type}
      onClick={handle}
      aria-label={ariaLabel ?? "Додати в кошик"}
      data-testid="welcome-card-add"
    >
      {!!showLabel && <span className={styles.div}>Додати в кошик</span>}
      <span className={styles.iconContainer}>
        <ArrowRight1 size={size2} />
      </span>
    </button>
  );
};

export default PrimaryButton2;
