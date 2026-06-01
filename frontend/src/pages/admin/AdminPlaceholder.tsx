import React from "react";
import styles from "./AdminPlaceholder.module.css";

const AdminPlaceholder: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div className={styles.placeholder}>
      <div className={styles.icon}>🚧</div>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>Цей розділ зараз у розробці. Ми додамо його на наступних ітераціях.</p>
      <span className={styles.tag}>Скоро буде доступно</span>
    </div>
  );
};

export default AdminPlaceholder;
