import React from "react";
import { type CSSProperties } from "react";
import styles from "./search1.module.css";

export type Search1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Search1: React.FC<Search1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconSearch, className].join(" ")} data-size={size}>
      <img decoding="async"
        className={styles.vectorIcon}
        loading="lazy"
        width={15.1}
        height={15}
        alt=""
        src="/Vector.svg"
      />
    </div>
  );
};

export default Search1;
