import React, { useCallback, useEffect, useState } from "react";
import { listCallbacks, patchCallback, deleteCallback, CallbackItem } from "../../lib/admin-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminCallbacks.module.css";

type Filter = "all" | "new" | "in_progress" | "done" | "archived";

const FILTERS: { v: Filter; label: string }[] = [
  { v: "all", label: "Всі" },
  { v: "new", label: "Нові" },
  { v: "in_progress", label: "В обробці" },
  { v: "done", label: "Опрацьовані" },
  { v: "archived", label: "Архів" },
];

const STATUS_OPTIONS: { v: CallbackItem["status"]; label: string; cls: string }[] = [
  { v: "new", label: "Нова", cls: "statusNew" },
  { v: "in_progress", label: "В обробці", cls: "statusInProgress" },
  { v: "done", label: "Опрацьована", cls: "statusDone" },
  { v: "archived", label: "Архів", cls: "statusArchived" },
];

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

const AdminCallbacks: React.FC = () => {
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<CallbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCallbacks(filter);
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const onStatusChange = async (id: string, status: CallbackItem["status"]) => {
    try {
      const updated = await patchCallback(id, { status });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося оновити статус");
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Видалити заявку? Дію не можна відмінити.")) return;
    try {
      await deleteCallback(id);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося видалити");
    }
  };

  return (
    <div data-testid="admin-callbacks-page">
      <div className={styles.toolbar}>
        {FILTERS.map((f) => (
          <button
            key={f.v}
            type="button"
            className={`${styles.filter} ${filter === f.v ? styles.filterActive : ""}`}
            onClick={() => setFilter(f.v)}
            data-testid={`admin-callbacks-filter-${f.v}`}
          >
            {f.label}
          </button>
        ))}
        <button type="button" className={styles.refresh} onClick={load} disabled={loading} data-testid="admin-callbacks-refresh">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 12a9 9 0 0 1 15.5-6.3M21 6v6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12a9 9 0 0 1-15.5 6.3M3 18v-6h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {loading ? "Оновлення…" : "Оновити"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fdecea", color: "#c14a3c", padding: 14, borderRadius: 10, marginBottom: 16, fontSize: 13.5 }}>
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📞</div>
          <div>{filter === "all" ? "Ще немає заявок" : "Немає заявок у цьому статусі"}</div>
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Клієнт</th>
              <th>Телефон</th>
              <th>Коментар</th>
              <th>Статус</th>
              <th>Сповіщення</th>
              <th>Дата</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const st = STATUS_OPTIONS.find((s) => s.v === it.status);
              return (
                <tr key={it.id} data-testid={`admin-callback-row-${it.id}`}>
                  <td className={styles.name}>{it.name}</td>
                  <td>
                    <a href={`tel:${it.phone.replace(/\s|\(|\)|-/g, "")}`} className={styles.phone}>
                      {it.phone}
                    </a>
                  </td>
                  <td className={styles.comment}>{it.comment || <span style={{color:"#c9cabd"}}>—</span>}</td>
                  <td>
                    <BrandSelect
                      triggerClassName={styles.select}
                      value={it.status}
                      onChange={(v) => onStatusChange(it.id, v as CallbackItem["status"])}
                      options={STATUS_OPTIONS.map((o) => ({ value: o.v, label: o.label }))}
                      data-testid={`admin-callback-status-${it.id}`}
                      minWidth={150}
                    />
                  </td>
                  <td>
                    <div className={styles.notifyDots} title={`Telegram: ${it.notified_telegram ? "OK" : "—"}, Email: ${it.notified_email ? "OK" : "—"}`}>
                      <span className={`${styles.dot} ${it.notified_telegram ? styles.dotOk : styles.dotFail}`} />
                      <span className={`${styles.dot} ${it.notified_email ? styles.dotOk : styles.dotFail}`} />
                    </div>
                  </td>
                  <td className={styles.date}>{formatDate(it.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => onDelete(it.id)} data-testid={`admin-callback-delete-${it.id}`}>
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminCallbacks;
