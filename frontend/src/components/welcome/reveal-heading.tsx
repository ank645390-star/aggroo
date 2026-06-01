import React from "react";
import { useInViewOnce } from "../../lib/use-in-view-once";
import styles from "./reveal-heading.module.css";

/**
 * Single segment of a reveal heading.
 *   • text       — visible text content (will be split by whitespace).
 *   • className  — optional CSS-module class string applied to each
 *                  word span of this segment (use to inherit colour /
 *                  weight from the parent component's own module).
 */
export type RevealSegment = {
  text: string;
  className?: string;
};

/**
 * Logical "line" in a heading.  Each line renders on its own row;
 * the per-word stagger continues across lines so the whole heading
 * feels like one choreographed reveal.
 */
export type RevealLine = RevealSegment[];

export type RevealHeadingProps = {
  /** Either a flat list of segments (single line) or an array of lines. */
  lines: RevealLine[];
  /** Outer wrapper tag (h1/h2/h3/div/span). Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements;
  /** ClassName on the outer wrapper (parent module styling). */
  className?: string;
  /** ClassName applied to each `.line` element (parent module styling).
   *  Use a string for a single shared class, or array of strings to
   *  apply DIFFERENT classes per line (line index → array index). */
  lineClassName?: string | string[];
  /** Initial delay (ms) before the FIRST word starts. */
  baseDelay?: number;
  /** Per-word stagger (ms). */
  stagger?: number;
  /** IntersectionObserver options. */
  observer?: IntersectionObserverInit;
  /** data-testid on outer wrapper. */
  "data-testid"?: string;
  /** If true, every line wraps to its own flex row (block layout)
   *  instead of inline-flex. Use when the headline has hard line
   *  breaks in the design. */
  block?: boolean;
};

const splitWords = (text: string) =>
  text.split(/[^\S\u00A0]+/).filter((w) => w.length > 0);

/**
 * RevealHeading — drop-in animated heading that mirrors the hero
 * block's diagonal entrance.  Pass colored / weighted segments
 * via the `lines` prop; the component will split each segment
 * into words and stagger them left-to-right across the whole
 * heading.  Animation fires once when the element enters the
 * viewport (IntersectionObserver).
 *
 * Example:
 *   <RevealHeading
 *     as="h2"
 *     className={localStyles.title}
 *     lines={[
 *       [{ text: "Біотехнології", className: localStyles.span },
 *        { text: "захисту",       className: localStyles.span3 }],
 *       [{ text: "та живлення",   className: localStyles.span3 }],
 *     ]}
 *     block
 *   />
 */
const RevealHeading: React.FC<RevealHeadingProps> = ({
  lines,
  as = "div",
  className = "",
  lineClassName = "",
  baseDelay = 100,
  stagger = 80,
  observer,
  block = false,
  ...rest
}) => {
  const [ref, inView] = useInViewOnce<HTMLElement>(observer);
  const Tag = as as React.ElementType;

  // Flatten lines into a single word stream with absolute indices so
  // animation-delay grows left-to-right across the whole heading.
  let wordIdx = 0;
  const rendered = lines.map((line, lineI) => {
    const wordsInLine: React.ReactNode[] = [];
    line.forEach((segment, segI) => {
      const words = splitWords(segment.text);
      words.forEach((word, wI) => {
        const isLastInSegment = wI === words.length - 1;
        // trailing space is rendered via flex gap; no need to add &nbsp;
        wordsInLine.push(
          <span
            key={`l${lineI}-s${segI}-w${wI}`}
            className={[styles.wordInner, segment.className || ""]
              .filter(Boolean)
              .join(" ")}
            style={{ animationDelay: `${baseDelay + wordIdx * stagger}ms` }}
          >
            {word}
            {/* Keep last word in segment without trailing space */}
            {!isLastInSegment ? "\u00A0" : ""}
          </span>
        );
        wordIdx += 1;
      });
      // After each segment (except last), add a hard space between segments
      // — but only if next segment is on the same line.
      if (segI < line.length - 1) {
        wordsInLine.push(
          <span key={`l${lineI}-s${segI}-gap`} aria-hidden="true">
            {"\u00A0"}
          </span>
        );
      }
    });

    return (
      <span
        key={`line-${lineI}`}
        className={[
          block ? styles.lineBlock : styles.line,
          Array.isArray(lineClassName)
            ? lineClassName[lineI] || ""
            : lineClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {wordsInLine}
      </span>
    );
  });

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={[className, inView ? styles.active : ""]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {rendered}
    </Tag>
  );
};

export default RevealHeading;
