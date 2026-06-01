import React from "react";
import Tab1 from "./tab1";
import styles from "./tab-group1.module.css";

export type TabKey = "opis" | "dosage" | "composition" | "compatibility" | "specs";

export const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: "opis", label: "Опис" },
  { key: "dosage", label: "Дозування" },
  { key: "composition", label: "Склад" },
  { key: "compatibility", label: "Сумісність" },
  { key: "specs", label: "Характеристика" },
];

export type TabGroup1Type = {
  className?: string;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
};

const TabGroup1: React.FC<TabGroup1Type> = ({
  className = "",
  activeTab = "opis",
  onTabChange,
}) => {
  return (
    <section className={[styles.tabGroup, className].join(" ")}>
      <div className={styles.container}>
        {TAB_ITEMS.map((item) => (
          <Tab1
            key={item.key}
            state={item.key === activeTab ? "Active" : "Inactive"}
            prop={item.label}
            onClick={() => onTabChange?.(item.key)}
          />
        ))}
      </div>
      <div className={styles.tabGroupChild} />
    </section>
  );
};

export default TabGroup1;
