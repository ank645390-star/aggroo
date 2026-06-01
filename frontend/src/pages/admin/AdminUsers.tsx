import React, { useEffect, useState } from "react";
import { listAdminUsers, UserSummaryItem, UserSummaryListResp } from "../../lib/sales-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminSales.module.css";

const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString("uk-UA") : "—";
const fmtMoney = (n: number) => `${(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ₴`;

const AdminUsers: React.FC = () => {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin">("all");
  const [data, setData] = useState<UserSummaryListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params: any = { limit: 100 };
      if (q.trim()) params.q = q.trim();
      if (role !== "all") params.role = role;
      const r = await listAdminUsers(params);
      setData(r);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [role]);

  return (
    <div className={styles.wrap} data-testid="admin-sales-users">
      <div className={styles.toolbar}>
        <input className={styles.search} placeholder="Пошук: email, ім'я, телефон…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") load(); }} />
        <BrandSelect
          value={role}
          onChange={(v) => setRole(v as any)}
          options={[
            { value: "all", label: "Всі ролі" },
            { value: "user", label: "Користувачі" },
            { value: "admin", label: "Адміни" },
          ]}
          data-testid="users-filter-role"
          minWidth={160}
        />
        <button className={styles.btn} onClick={load} disabled={loading}>Оновити</button>
        {data && <span className={styles.muted}>Всього: <b>{data.total}</b></span>}
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Користувач</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Замовлень</th>
              <th>Оплачено</th>
              <th style={{ textAlign: "right" }}>LTV</th>
              <th>Останнє</th>
              <th>Реєстр.</th>
            </tr>
          </thead>
          <tbody>
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={9} className={styles.tableEmpty}>{loading ? "Завантаження…" : "Немає користувачів"}</td></tr>
            )}
            {data?.items.map((u: UserSummaryItem) => (
              <tr key={u.id} data-testid={`user-row-${u.email}`}>
                <td><div style={{ fontWeight: 600 }}>{u.firstName || "—"} {u.lastName}</div><div className={styles.muted} style={{ fontSize: 11 }}>{u.id.slice(0, 12)}…</div></td>
                <td>{u.email}</td>
                <td className={styles.mono}>{u.phone || "—"}</td>
                <td>{u.role === "admin" ? <span className={styles.tag} style={{ background: "#fde6c4", color: "#7c2d12" }}>admin</span> : <span className={styles.muted}>user</span>}</td>
                <td className={styles.mono}>{u.orders_count}</td>
                <td className={styles.mono}>{u.paid_orders_count}</td>
                <td className={styles.mono} style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(u.lifetime_value)}</td>
                <td className={styles.muted}>{fmt(u.last_order_at)}</td>
                <td className={styles.muted}>{fmt(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
