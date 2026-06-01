import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSalesDashboard, DashboardKpi } from "../../lib/sales-api";
import styles from "./AdminSales.module.css";

const fmtMoney = (n: number) => `${(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ₴`;

const Tile: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string; testid?: string }>
  = ({ label, value, sub, accent = "#1f2a18", testid }) => (
    <div className={styles.kpi} data-testid={testid}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue} style={{ color: accent }}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );

const AdminSalesDashboard: React.FC = () => {
  const [kpi, setKpi] = useState<DashboardKpi | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try { setKpi(await getSalesDashboard()); }
    catch (e: any) { setError(e?.response?.data?.detail || "Не вдалося завантажити"); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className={styles.wrap} data-testid="admin-sales-dashboard">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Link to="/admin/sales/orders" className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Реєстр замовлень</Link>
        <Link to="/admin/sales/abandoned-carts" className={styles.btn} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Покинуті кошики</Link>
        <Link to="/admin/sales/users" className={styles.btn} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Користувачі</Link>
        <Link to="/admin/sales/upsells" className={styles.btn} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Допродажі</Link>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.kpis}>
        <Tile label="Сумарна виручка"     value={fmtMoney(kpi?.revenue_total || 0)} sub={`Сер. чек: ${fmtMoney(kpi?.avg_order_value || 0)}`} accent="#1b4332" testid="kpi-revenue-total" />
        <Tile label="Оплачено сьогодні"  value={fmtMoney(kpi?.revenue_today || 0)} accent="#0d9344" />
        <Tile label="Оплачено за 7 днів"  value={fmtMoney(kpi?.revenue_7d || 0)} accent="#0d9344" />
        <Tile label="Оплачено за 30 днів" value={fmtMoney(kpi?.revenue_30d || 0)} accent="#0d9344" />
        <Tile label="Замовлень всього"  value={kpi?.orders_total ?? "—"} sub={`Оплачено: ${kpi?.orders_paid ?? 0}`} testid="kpi-orders-total" />
        <Tile label="Очік. підтвердж."   value={kpi?.orders_awaiting_confirmation ?? "—"} accent="#b45309" sub="Перевірити перекази" testid="kpi-orders-awaiting" />
        <Tile label="Не оплачені"          value={kpi?.orders_pending ?? "—"} accent="#92400e" sub="накладені / pending" />
        <Tile label="Покинуті кошики"     value={kpi?.abandoned_carts ?? "—"} sub={fmtMoney(kpi?.abandoned_value || 0)} accent="#b45309" testid="kpi-abandoned" />
        <Tile label="Користувачів"          value={kpi?.users_total ?? "—"} sub={`+${kpi?.users_new_24h ?? 0} за 24г`} />
        <Tile label="Конверсія кошик → оплата" value={`${(kpi?.conversion_rate ?? 0).toFixed(1)} %`} accent="#1b4332" />
      </div>

      {kpi?.top_products && kpi.top_products.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Топ товарів (за к-тю в оплачених)</h3>
          <div>
            {kpi.top_products.map((p, i) => (
              <div className={styles.itemRow} key={i}>
                <div className={styles.itemImg} style={{ backgroundImage: `url(${p.photo || "/Photo@2x.webp"})` }} />
                <div className={styles.itemMain}>
                  <span className={styles.itemName}>{p.name}</span>
                  <span className={styles.itemMeta}>Продано: {p.qty}</span>
                </div>
                <div className={styles.itemTotal}>{fmtMoney(p.revenue)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminSalesDashboard;
