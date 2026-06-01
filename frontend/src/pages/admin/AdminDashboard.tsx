import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats, DashboardStats } from "../../lib/admin-api";
import styles from "./AdminDashboard.module.css";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getStats();
        if (!cancelled) setStats(s);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.detail || "Не вдалося завантажити статистику");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div data-testid="admin-dashboard">
      <div className={styles.grid}>
        <div className={`${styles.card} ${stats && stats.new > 0 ? styles.cardAttention : ""}`}>
          <span className={styles.cardLabel}>Нові заявки</span>
          <span className={styles.cardValue} data-testid="stat-new">{stats?.new ?? "—"}</span>
          <span className={styles.cardSub}>Потребують уваги</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>В обробці</span>
          <span className={`${styles.cardValue} ${styles.cardWarn}`}>{stats?.in_progress ?? "—"}</span>
          <span className={styles.cardSub}>Клієнти на зв'язку</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Опрацьовані</span>
          <span className={`${styles.cardValue} ${styles.cardOk}`}>{stats?.done ?? "—"}</span>
          <span className={styles.cardSub}>Дзвінки виконано</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Сьогодні</span>
          <span className={styles.cardValue}>{stats?.today ?? "—"}</span>
          <span className={styles.cardSub}>Нових за день</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>За тиждень</span>
          <span className={styles.cardValue}>{stats?.week ?? "—"}</span>
          <span className={styles.cardSub}>Нових за 7 днів</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Всього</span>
          <span className={styles.cardValue}>{stats?.total ?? "—"}</span>
          <span className={styles.cardSub}>За весь час</span>
        </div>
      </div>

      {error && (
        <div className={styles.section} style={{ background: "#fdecea", color: "#c14a3c" }}>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Швидкі дії</h2>
        <p className={styles.sectionDesc}>Перейдіть до потрібної секції адмін-панелі.</p>
        <div className={styles.quickGrid}>
          <Link to="/admin/callbacks" className={styles.quickLink}>
            <span className={styles.quickIcon}>☎️</span>Опрацювати заявки
          </Link>
          <Link to="/admin/notifications" className={styles.quickLink}>
            <span className={styles.quickIcon}>⚙️</span>Налаштувати сповіщення
          </Link>
          <Link to="/admin/products" className={styles.quickLink}>
            <span className={styles.quickIcon}>📦</span>Каталог товарів
          </Link>
          <Link to="/admin/blog" className={styles.quickLink}>
            <span className={styles.quickIcon}>📝</span>Редагувати блог
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
