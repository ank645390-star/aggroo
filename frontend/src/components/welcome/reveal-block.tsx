import React from "react";
import { useInViewOnce } from "../../lib/use-in-view-once";
import styles from "./reveal-block.module.css";

export type RevealBlockProps = {
  /** Outer wrapper tag. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements;
  /** Outer class from parent's CSS module. */
  className?: string;
  /** Optional per-instance entrance delay (ms). */
  delay?: number;
  /** IntersectionObserver options. */
  observer?: IntersectionObserverInit;
  /** data-testid passthrough. */
  "data-testid"?: string;
  children?: React.ReactNode;
};

/**
 * RevealBlock — drop-in wrapper that fades + slides a block of
 * content into place ONCE when the parent enters the viewport.
 *
 * Use for paragraphs, cards, callouts — anywhere a softer "appears
 * as a block" motion is wanted instead of the per-word reveal used
 * for big headings.
 */
const RevealBlock: React.FC<RevealBlockProps> = ({
  as = "div",
  className = "",
  delay = 0,
  observer,
  children,
  ...rest
}) => {
  const [ref, inView] = useInViewOnce<HTMLElement>(observer);
  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={[styles.block, inView ? styles.active : "", className]
        .filter(Boolean)
        .join(" ")}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default RevealBlock;
