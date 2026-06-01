import React from "react";
import { type CSSProperties } from "react";
import styles from "./cube1.module.css";

export type Cube1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const Cube1: React.FC<Cube1Type> = ({ className = "", size = 16 }) => {
  return (
    <div className={[styles.iconCube, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={13.3}
        height={15}
        alt=""
        src="/Vector5.svg"
      />
    </div>
  );
};

export default Cube1;
