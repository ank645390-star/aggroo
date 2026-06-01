import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listAdminOrders, AdminOrderListItem, OrderListResp,
  paymentStatusLabel, internalStatusLabel, paymentMethodLabel,
  PaymentStatus, InternalStatus, PaymentMethod,
} from "../../lib/sales-api";
import BrandSelect from "../../components/admin/BrandSelect";
import styles from "./AdminSales.module.css";

const PAYMENT_FILTERS: { v: PaymentStatus | "all"; label: string }[] = [
  { v: "all", label: "Всі" },
  { v: "pending", label: "Не оплачені" },
  { v: "awaiting_confirmation", label: "Очік. підтверд." },
  { v: "paid", label: "Оплачені" },
  { v: "refunded", label: "Повернення" },
  { v: "failed", label: "Невдалі" },
];
const INTERNAL_FILTERS: { v: InternalStatus | "all"; label: string }[] = [
  { v: "all", label: "Будь-який" },
  { v: "new", label: "Нові" },
  { v: "confirmed", label: "Підтверд." },
  { v: "packed", label: "Запаковано" },
  { v: "shipped", label: "Відправлено" },
  { v: "delivered", label: "Доставлено" },
  { v: "cancelled", label: "Скасовано" },
];
const METHOD_FILTERS: { v: PaymentMethod | "all"; label: string }[] = [
  { v: "all", label: "Будь-яка оплата" },
  { v: "cod", label: "Накладений" },
  { v: "bank_transfer", label: "Переказ" },
  { v: "card", label: "Картка" },
];

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
};
const fmtMoney = (n: number) => `${(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ₴`;

const Badge: React.FC<{ text: string; color: string }> = ({ text, color }) => (
  <span className={styles.badge} style={{ background: `${color}1a`, color, borderColor: `${color}44` }}>{text}</span>
);

const AdminOrders: React.FC = () => {
  const [payStatus, setPayStatus] = useState<PaymentStatus | "all">("all");
  const [intStatus, setIntStatus] = useState<InternalStatus | "all">("all");
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<OrderListResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params: any = { limit: 100 };
      if (payStatus !== "all") params.payment_status = payStatus;
      if (intStatus !== "all") params.internal_status = intStatus;
      if (method !== "all") params.payment_method = method;
      if (q.trim()) params.q = q.trim();
      const r = await listAdminOrders(params);
      setData(r);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити замовлення");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [payStatus, intStatus, method]);

  return (
    <div className={styles.wrap} data-testid="admin-sales-orders">
      <div className={styles.toolbar}>
        <input
          type="text" className={styles.search} placeholder="Пошук: №, телефон, ім'я, email, місто…"
          value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") load(); }}
          data-testid="orders-search"
        />
        <BrandSelect
          value={payStatus}
          onChange={(v) => setPayStatus(v as any)}
          options={PAYMENT_FILTERS.map((f) => ({ value: f.v, label: f.label }))}
          data-testid="orders-filter-payment"
          minWidth={180}
        />
        <BrandSelect
          value={intStatus}
          onChange={(v) => setIntStatus(v as any)}
          options={INTERNAL_FILTERS.map((f) => ({ value: f.v, label: f.label }))}
          data-testid="orders-filter-internal"
          minWidth={180}
        />
        <BrandSelect
          value={method}
          onChange={(v) => setMethod(v as any)}
          options={METHOD_FILTERS.map((f) => ({ value: f.v, label: f.label }))}
          data-testid="orders-filter-method"
          minWidth={180}
        />
        <button className={styles.btn} onClick={load} disabled={loading}>{loading ? "Завантаження…" : "Оновити"}</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableShell}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Дата</th>
              <th>Статус оплати</th>
              <th>Метод</th>
              <th>Статус</th>
              <th>Клієнт</th>
              <th>Товарів</th>
              <th style={{ textAlign: "right" }}>Сума</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(!data || data.items.length === 0) && (
              <tr><td colSpan={9} className={styles.tableEmpty}>{loading ? "Завантаження…" : "Замовлень не знайдено"}</td></tr>
            )}
            {data?.items.map((o: AdminOrderListItem) => {
              const ps = paymentStatusLabel(o.payment_status);
              const is = internalStatusLabel(o.internal_status);
              return (
                <tr key={o.id} data-testid={`order-row-${o.number}`}>
                  <td className={styles.mono}><Link to={`/admin/sales/orders/${o.id}`} className={styles.linkRow}>{o.number}</Link></td>
                  <td className={styles.muted}>{fmtDate(o.created_at)}</td>
                  <td><Badge text={ps.text} color={ps.color} /></td>
                  <td className={styles.muted}>{paymentMethodLabel(o.payment_method)}</td>
                  <td><Badge text={is.text} color={is.color} /></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.recipient_first_name} {o.recipient_last_name}</div>
                    <div className={styles.muted}>{o.phone}{o.customer_email ? ` • ${o.customer_email}` : ""}</div>
                  </td>
                  <td className={styles.mono}>{o.items_count}</td>
                  <td className={styles.mono} style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(o.total)}</td>
                  <td><Link to={`/admin/sales/orders/${o.id}`} className={styles.btnGhost} style={{ padding: "6px 10px", display: "inline-block", borderRadius: 6, border: "1px solid #d6d8cc" }}>Деталі</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;
