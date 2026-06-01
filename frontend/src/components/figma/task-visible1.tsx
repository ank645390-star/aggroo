import React from "react";
import { type CSSProperties } from "react";
import styles from "./task-visible1.module.css";

export type TaskVisible1Type = {
  className?: string;

  /** Variant props */
  size?: any;
};

const TaskVisible1: React.FC<TaskVisible1Type> = ({
  className = "",
  size = 36,
}) => {
  return (
    <div className={[styles.leftIcon, className].join(" ")} data-size={size}>
      <img loading="lazy" decoding="async"
        className={styles.vectorIcon}
        width={45}
        height={51.3}
        alt=""
        src="/Vector18.svg"
      />
    </div>
  );
};

export default TaskVisible1;
