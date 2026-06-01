import React from "react";
import styles from "./volume-chip1.module.css";

export type VolumeChip1Type = {
  className?: string;
  prop?: string;
  state?: "Active" | "Inactive";
  onClick?: () => void;
  disabled?: boolean;
};

const VolumeChip1: React.FC<VolumeChip1Type> = ({
  className = "",
  state = "Inactive",
  prop,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      className={[styles.root, className].join(" ")}
      data-state={state}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === "Active"}
    >
      <span className={styles.div}>{prop}</span>
    </button>
  );
};

export default VolumeChip1;
