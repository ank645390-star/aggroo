import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAdminOrder, patchAdminOrder, confirmPayment, refundPayment, failPayment,
  adminUploadProof, addOrderNote,
  AdminOrderDetail, paymentStatusLabel, internalStatusLabel, paymentMethodLabel,
  InternalStatus,
} from "../../lib/sales-api";
import styles from "./AdminSales.module.css";
import BrandSelect from "../../components/admin/BrandSelect";

const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleString("uk-UA") : "—";
const fmtMoney = (n: number | null | undefined) => `${(n || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 })} ₴`;

const INTERNAL_OPTIONS: { v: InternalStatus; label: string }[] = [
  { v: "new",       label: "Нове" },
  { v: "confirmed", label: "Підтверджено" },
  { v: "packed",    label: "Запаковано" },
  { v: "shipped",   label: "Відправлено" },
  { v: "delivered", label: "Доставлено" },
  { v: "cancelled", label: "Скасовано" },
];

const AdminOrderDetailPage: React.FC = () => {
  const { id = "" } = useParams();
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const proofRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const o = await getAdminOrder(id);
      setOrder(o);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити");
    } finally { setLoading(false); }
  };
  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className={styles.wrap}><div className={styles.card}>Завантаження…</div></div>;
  if (error || !order) return <div className={styles.wrap}><div className={styles.error}>{error || "Замовлення не знайдено"}</div><Link to="/admin/sales/orders" className={styles.btn}>← До реєстру</Link></div>;

  const ps = paymentStatusLabel(order.payment_status);
  const is = internalStatusLabel(order.internal_status);

  const wrap = async (fn: () => Promise<AdminOrderDetail>) => {
    setBusy(true); setError(null);
    try { const o = await fn(); setOrder(o); }
    catch (e: any) { setError(e?.response?.data?.detail || "Дія не виконалась"); }
    finally { setBusy(false); }
  };

  const onConfirmPay = () => {
    if (!window.confirm(`Підтвердити оплату на суму ${fmtMoney(order.total)}?`)) return;
    wrap(() => confirmPayment(order.id));
  };
  const onRefund = () => {
    const txt = window.prompt("Причина повернення:");
    if (!txt) return; wrap(() => refundPayment(order.id, txt));
  };
  const onFail = () => {
    const txt = window.prompt("Причина невдачі:");
    if (!txt) return; wrap(() => failPayment(order.id, txt));
  };
  const onUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    await wrap(() => adminUploadProof(order.id, file));
    if (proofRef.current) proofRef.current.value = "";
  };
  const onAddNote = async () => {
    const t = note.trim(); if (!t) return;
    await wrap(() => addOrderNote(order.id, t)); setNote("");
  };
  const onChangeInternal = async (v: InternalStatus) => {
    await wrap(() => patchAdminOrder(order.id, { internal_status: v }));
  };
  const onSaveTtn = async () => {
    const t = window.prompt("ТТН:", order.ttn || "");
    if (t == null) return;
    await wrap(() => patchAdminOrder(order.id, { ttn: t.trim() }));
  };
  const onSaveEmail = async () => {
    const t = window.prompt("Email клієнта:", order.customer_email || "");
    if (t == null) return;
    await wrap(() => patchAdminOrder(order.id, { customer_email: t.trim() }));
  };

  const Badge: React.FC<{ text: string; color: string; size?: "sm" | "md" }> = ({ text, color, size = "md" }) => (
    <span className={styles.badge} style={{ background: `${color}1a`, color, borderColor: `${color}44`, fontSize: size === "sm" ? 11 : 12 }}>{text}</span>
  );

  return (
    <div className={styles.wrap} data-testid="admin-order-detail">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link to="/admin/sales/orders" className={styles.btnGhost} style={{ padding: "6px 12px", textDecoration: "none", display: "inline-block", lineHeight: "26px" }}>← До реєстру</Link>
        <h2 style={{ margin: 0, fontSize: 22 }}>Замовлення {order.number}</h2>
        <Badge text={ps.text} color={ps.color} />
        <Badge text={is.text} color={is.color} />
      </div>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.detailGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Items */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Товари ({order.items_count})</h3>
            <div>
              {order.items.map((it: any, idx: number) => (
                <div className={styles.itemRow} key={idx}>
                  <div className={styles.itemImg} style={{ backgroundImage: `url(${it.photo || "/Photo@2x.webp"})` }} />
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{it.name}</span>
                    <span className={styles.itemMeta}>
                      {it.volume ? `${it.volume} • ` : ""}к-ть {it.quantity} • {fmtMoney(it.unit_price)}/од.
                    </span>
                  </div>
                  <div className={styles.itemTotal}>{fmtMoney(it.total)}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid #eceee5", marginTop: 8, paddingTop: 10, display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className={styles.muted}>Проміжний</span><span className={styles.mono}>{fmtMoney(order.subtotal)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span className={styles.muted}>Доставка</span><span className={styles.mono}>{fmtMoney(order.delivery_cost)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16 }}><span>Разом</span><span className={styles.mono}>{fmtMoney(order.total)}</span></div>
            </div>
          </section>

          {/* Timeline */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Історія / події</h3>
            <div className={styles.timeline}>
              {(order.events || []).slice().reverse().map((ev, i) => (
                <div key={i} className={styles.timelineItem}>
                  <span className={styles.timelineDot} />
                  <div className={styles.timelineMain}>
                    <span><b>{ev.type}</b> {ev.detail ? `— ${ev.detail}` : ""}</span>
                    <span className={styles.timelineMeta}>{fmtDate(ev.created_at)} • {ev.actor}{ev.actor_email ? ` (${ev.actor_email})` : ""}</span>
                  </div>
                </div>
              ))}
              {(!order.events || order.events.length === 0) && <div className={styles.muted}>Подій немає</div>}
            </div>
          </section>

          {/* Admin notes */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Нотатки адміна</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(order.admin_notes || []).map((n, i) => (
                <div key={i} className={styles.timelineItem}>
                  <span className={styles.timelineDot} style={{ background: "#b45309" }} />
                  <div className={styles.timelineMain}>
                    <span>{n.text}</span>
                    <span className={styles.timelineMeta}>{fmtDate(n.created_at)}{n.author_email ? ` • ${n.author_email}` : ""}</span>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8 }}>
                <input className={styles.input} placeholder="Додати нотатку…" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className={styles.btnPrimary + " " + styles.btn} onClick={onAddNote} disabled={busy || !note.trim()}>Додати</button>
              </div>
            </div>
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Payment block */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Оплата</h3>
            <dl className={styles.kv}>
              <dt>Статус</dt><dd><Badge text={ps.text} color={ps.color} /></dd>
              <dt>Метод</dt><dd>{paymentMethodLabel(order.payment_method)}</dd>
              <dt>Сума</dt><dd className={styles.mono}>{fmtMoney(order.total)}</dd>
              <dt>Оплачено</dt><dd>{order.paid_amount ? <span className={styles.mono}>{fmtMoney(order.paid_amount)}</span> : "—"}</dd>
              <dt>Дата опл.</dt><dd>{fmtDate(order.paid_at)}</dd>
            </dl>
            {order.payment_proof_url && (
              <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className={styles.linkRow}>Переглянути підтвердження оплати →</a>
            )}
            <div className={styles.actions}>
              {order.payment_status !== "paid" && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onConfirmPay} disabled={busy} data-testid="order-confirm-payment">Підтвердити оплату</button>
              )}
              {order.payment_status === "paid" && (
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onRefund} disabled={busy}>Повернути</button>
              )}
              {order.payment_status !== "failed" && order.payment_status !== "paid" && (
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onFail} disabled={busy}>Позначити як невдалу</button>
              )}
              <label className={styles.btn} style={{ cursor: "pointer" }}>
                Завантажити підтв.
                <input ref={proofRef} type="file" style={{ display: "none" }} accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={onUploadProof} disabled={busy} />
              </label>
            </div>
          </section>

          {/* Status / shipping */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Статус / доставка</h3>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Внутрішній статус</span>
              <BrandSelect
                value={order.internal_status}
                onChange={(v) => onChangeInternal(v as InternalStatus)}
                options={INTERNAL_OPTIONS.map((o) => ({ value: o.v, label: o.label }))}
                disabled={busy}
                data-testid="order-detail-internal-status"
                minWidth={200}
              />
            </div>
            <dl className={styles.kv}>
              <dt>Перевізник</dt><dd>{order.carrier === "novaposhta" ? "Нова Пошта" : "Укрпошта"}</dd>
              <dt>ТТН</dt><dd className={styles.mono}>{order.ttn || "—"} <button className={styles.btnGhost} style={{ padding: "2px 8px", marginLeft: 6, fontSize: 12 }} onClick={onSaveTtn}>Ред.</button></dd>
              <dt>Місто</dt><dd>{order.city}</dd>
              <dt>Адреса</dt><dd>{order.address}</dd>
            </dl>
          </section>

          {/* Customer */}
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Клієнт</h3>
            <dl className={styles.kv}>
              <dt>ПІБ</dt><dd>{order.recipient_first_name} {order.recipient_last_name}</dd>
              <dt>Телефон</dt><dd className={styles.mono}>{order.phone}</dd>
              <dt>Email</dt><dd>{order.customer_email || "—"} <button className={styles.btnGhost} style={{ padding: "2px 8px", marginLeft: 6, fontSize: 12 }} onClick={onSaveEmail}>Ред.</button></dd>
              <dt>Session</dt><dd className={styles.mono} style={{ fontSize: 11 }}>{order.session_id}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default AdminOrderDetailPage;
