import React, { useEffect, useState } from "react";
import {
  listAbandonedCarts, markCartContacted, AbandonedCartItem, AbandonedCartListResp,
} from "../../lib/sales-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminSales.module.css";

const fmtMoney = (n: number) => `${(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ₴`;
const fmtMins = (m: number) => {
  if (m < 60) return `${m} хв.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} год.`;
  return `${Math.floor(h / 24)} д.`;
};

const AdminAbandonedCarts: React.FC = () => {
  const [threshold, setThreshold] = useState<number>(30);
  const [contactedFilter, setContactedFilter] = useState<"all" | "yes" | "no">("all");
  const [data, setData] = useState<AbandonedCartListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params: any = { threshold_minutes: threshold, limit: 100 };
      if (contactedFilter !== "all") params.contacted = contactedFilter === "yes";
      const r = await listAbandonedCarts(params);
      setData(r);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [threshold, contactedFilter]);

  const onContacted = async (sid: string) => {
    const note = window.prompt("Нотатка (опція):") || undefined;
    try {
      await markCartContacted(sid, note);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Не вдалося");
    }
  };

  return (
    <div className={styles.wrap} data-testid="admin-abandoned-carts">
      <div className={styles.toolbar}>
        <div className={styles.field} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <span className={styles.fieldLabel} style={{ margin: 0 }}>Не торкались понад:</span>
          <BrandSelect
            value={String(threshold)}
            onChange={(v) => setThreshold(Number(v))}
            options={[
              { value: "30", label: "30 хв" },
              { value: "60", label: "1 год" },
              { value: "180", label: "3 год" },
              { value: "720", label: "12 год" },
              { value: "1440", label: "1 день" },
              { value: "4320", label: "3 дні" },
              { value: "10080", label: "7 днів" },
            ]}
            data-testid="abandoned-filter-threshold"
            minWidth={120}
          />
        </div>
        <BrandSelect
          value={contactedFilter}
          onChange={(v) => setContactedFilter(v as any)}
          options={[
            { value: "all", label: "Будь-які" },
            { value: "no", label: "Не контактували" },
            { value: "yes", label: "Вже контактували" },
          ]}
          data-testid="abandoned-filter-contacted"
          minWidth={180}
        />
        <button className={styles.btn} onClick={load} disabled={loading}>Оновити</button>
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Клієнт</th>
              <th>Контакти</th>
              <th>Товарів</th>
              <th style={{ textAlign: "right" }}>Сума</th>
              <th>Остання активн.</th>
              <th>Контактували</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={7} className={styles.tableEmpty}>{loading ? "Завантаження…" : "Порожньо — немає покинутих кошиків"}</td></tr>
            )}
            {data?.items.map((c: AbandonedCartItem) => (
              <tr key={c.session_id} data-testid={`cart-row-${c.session_id}`}>
                <td>
                  <div style={{ fontWeight: 600 }}>{c.contact_name || "—"}</div>
                  <div className={styles.muted} style={{ fontSize: 11 }}>{c.session_id.slice(0, 20)}…</div>
                </td>
                <td>
                  <div className={styles.mono}>{c.contact_phone || "—"}</div>
                  {c.contact_email && <div className={styles.muted}>{c.contact_email}</div>}
                </td>
                <td className={styles.mono}>{c.items_count}</td>
                <td className={styles.mono} style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(c.estimated_total)}</td>
                <td className={styles.muted}>{fmtMins(c.minutes_since_update)} тому</td>
                <td>
                  {c.contacted_at
                    ? <span style={{ color: "#0d9344", fontSize: 12 }}>✓ {new Date(c.contacted_at).toLocaleDateString("uk-UA")}<br/><span className={styles.muted}>{c.contacted_by}</span></span>
                    : <span className={styles.muted}>—</span>}
                </td>
                <td><button className={`${styles.btn} ${c.contacted_at ? styles.btnGhost : styles.btnPrimary}`} onClick={() => onContacted(c.session_id)}>{c.contacted_at ? "Оновити нотатку" : "Зв'язався"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAbandonedCarts;
