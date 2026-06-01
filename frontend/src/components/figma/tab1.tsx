import React from "react";
import styles from "./tab1.module.css";

export type Tab1Type = {
  className?: string;
  prop?: string;

  /** Variant props */
  state?: "Active" | "Inactive" | string;
  onClick?: () => void;
};

const Tab1: React.FC<Tab1Type> = ({
  className = "",
  state = "Active",
  prop,
  onClick,
}) => {
  return (
    <button
      className={[styles.root, className].join(" ")}
      data-state={state}
      onClick={onClick}
      type="button"
    >
      <div className={styles.div}>{prop}</div>
    </button>
  );
};

export default Tab1;
