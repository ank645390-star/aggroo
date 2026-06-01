import React, { useRef } from "react";
import styles from "./tilt-card.module.css";

export type TiltCardProps = {
  className?: string;
  /** Kept for API compat — rotation tilt is now disabled */
  maxTilt?: number;
  /** Translate-Z lift on hover in px (default 10) */
  lift?: number;
  /** Kept for API compat — glare is disabled */
  glare?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
};

/**
 * TiltCard — wraps any card content and applies a SUBTLE static hover lift
 * (no cursor-tracking 3D rotation).  Earlier версія обертала картку за
 * курсором по всім кутам — користувач попросив прибрати оберти і залишити
 * лише м'який ефект "підняття" при наведенні.
 */
const TiltCard: React.FC<TiltCardProps> = ({
  className = "",
  maxTilt: _maxTilt = 6,
  lift = 10,
  glare: _glare = false,
  children,
  style,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={wrapRef}
      className={[styles.tilt, className].filter(Boolean).join(" ")}
      style={{ ...style, ["--tilt-lift" as any]: `${lift}px` }}
    >
      <div className={styles.inner}>{children}</div>
    </div>
  );
};

export default TiltCard;
