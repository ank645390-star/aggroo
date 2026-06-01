import React, { useEffect, useMemo, useState } from "react";
import Seo from "../components/Seo";
import ProfileLayout from "./profile-layout";
import { fetchOrders, OrderDTO, OrderStatus } from "../lib/profile-api";
import styles from "./profile.module.css";

/* =====================================================================
   /profile/orders — Історія замовлень

   Дизайн картки (на одне замовлення):
     • header  — №, дата, статус, перевізник + ТТН (для Нової Пошти)
     • body    — список товарів з фото, назвою, описом, об'ємом, к-стю, сумою
     • footer  — адреса доставки, отримувач, разом, кнопки
   ===================================================================== */

const STATUS_LABEL: Record<OrderStatus, string> = {
  in_progress: "В обробці",
  delivered:   "Доставлено",
  cancelled:   "Скасовано",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatTtn(ttn: string | null): string {
  if (!ttn) return "—";
  // 14-digit TTN: XXXX XXXX XXXX XX
  if (/^\d{14}$/.test(ttn)) {
    return `${ttn.slice(0, 4)} ${ttn.slice(4, 8)} ${ttn.slice(8, 12)} ${ttn.slice(12, 14)}`;
  }
  return ttn;
}

function formatPrice(v: number): string {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(v);
}

const ProfileOrders: React.FC = () => {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const items = await fetchOrders();
        if (!cancelled) setOrders(items);
      } catch (err) {
        if (!cancelled) {
          console.warn("[orders] load failed", err);
          setError("Не вдалося завантажити історію замовлень");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const counts = useMemo(() => {
    const map: Record<"all" | OrderStatus, number> = {
      all: orders.length,
      in_progress: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders) map[o.status]++;
    return map;
  }, [orders]);

  const copyTtn = async (ttn: string) => {
    try {
      await navigator.clipboard.writeText(ttn);
      setCopied(ttn);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ProfileLayout breadcrumb="Історія замовлень" title="Історія замовлень">
      <Seo title="Історія замовлень" canonical="/profile/orders" noindex />
      {/* ===== Filter chips ===== */}
      <div className={styles.orderFilters} role="tablist" aria-label="Фільтр замовлень">
        {([
          ["all", "Усі"],
          ["in_progress", "В обробці"],
          ["delivered", "Доставлені"],
          ["cancelled", "Скасовані"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`${styles.orderFilterChip} ${filter === key ? styles.orderFilterChipActive : ""}`}
            onClick={() => setFilter(key)}
            data-testid={`orders-filter-${key}`}
            role="tab"
            aria-selected={filter === key}
          >
            <span>{label}</span>
            <span className={styles.orderFilterCount}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* ===== States ===== */}
      {loading && <div className={styles.ordersEmpty}>Завантажуємо історію…</div>}

      {!loading && error && (
        <div className={styles.ordersEmpty} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.ordersEmpty}>
          {filter === "all"
            ? "У вас поки немає жодного замовлення."
            : `Немає замовлень зі статусом «${STATUS_LABEL[filter as OrderStatus]}»`}
        </div>
      )}

      {/* ===== Order cards ===== */}
      <div className={styles.orderCards}>
        {filtered.map((o) => (
          <article
            key={o.id}
            className={styles.orderCard}
            data-testid="order-card"
            data-status={o.status}
          >
            {/* HEADER */}
            <header className={styles.orderCardHeader}>
              <div className={styles.orderCardHeaderMain}>
                <h3 className={styles.orderCardNumber}>Замовлення {o.number}</h3>
                <span className={styles.orderCardDate}>від {formatDate(o.created_at)}</span>
              </div>
              <StatusBadge status={o.status} />
            </header>

            {/* SHIPPING SUMMARY */}
            <div className={styles.orderShippingRow}>
              <span
                className={
                  o.carrier === "novaposhta"
                    ? styles.carrierBadgeNP
                    : styles.carrierBadgeUP
                }
              >
                {o.carrier === "novaposhta"
                  ? `Нова Пошта · ${o.delivery_mode === "courier" ? "кур'єр" : "відділення"}`
                  : "Укр Пошта"}
              </span>
              {o.carrier === "novaposhta" && o.ttn ? (
                <button
                  type="button"
                  className={styles.ttnPill}
                  onClick={() => copyTtn(o.ttn!)}
                  title="Натисніть, щоб скопіювати ТТН"
                  data-testid="order-ttn"
                >
                  <span className={styles.ttnLabel}>ТТН:</span>
                  <span className={styles.ttnValue}>{formatTtn(o.ttn)}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="8" y="8" width="13" height="13" rx="2" stroke="#1b4332" strokeWidth="1.6"/>
                    <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" stroke="#1b4332" strokeWidth="1.6"/>
                  </svg>
                  {copied === o.ttn && <span className={styles.ttnCopied}>Скопійовано</span>}
                </button>
              ) : (
                <span className={styles.ttnPillEmpty}>ТТН формується після оформлення</span>
              )}
              <span className={styles.orderItemsCount}>
                {o.items_count} {pluralUa(o.items_count, ["товар", "товари", "товарів"])}
              </span>
            </div>

            {/* ITEMS */}
            <ul className={styles.orderItemsList}>
              {o.items.map((it, idx) => (
                <li key={`${o.id}-${idx}`} className={styles.orderItem} data-testid="order-item">
                  <div className={styles.orderItemPhoto}>
                    {it.photo ? (
                      <img decoding="async" src={it.photo} alt={it.name} loading="lazy" />
                    ) : (
                      <div className={styles.orderItemPhotoPlaceholder}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#93928c" strokeWidth="1.4"/>
                          <path d="M3 16l5-4 4 3 6-5 3 2" stroke="#93928c" strokeWidth="1.4"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.orderItemMain}>
                    <div className={styles.orderItemTopRow}>
                      <h4 className={styles.orderItemName}>{it.name}</h4>
                      <span className={styles.orderItemUnitPrice}>
                        {formatPrice(it.unit_price)} ₴
                      </span>
                    </div>
                    {it.desc && <p className={styles.orderItemDesc}>{it.desc}</p>}
                    <div className={styles.orderItemMeta}>
                      <span className={styles.orderItemMetaVolume}>
                        {it.volume || "—"}
                      </span>
                      <span className={styles.orderItemMetaDot}>·</span>
                      <span className={styles.orderItemMetaQty}>
                        {it.quantity} шт
                      </span>
                      <span className={styles.orderItemMetaSpacer} />
                      <span className={styles.orderItemMetaTotal}>
                        {formatPrice(it.total)} ₴
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* FOOTER */}
            <footer className={styles.orderCardFooter}>
              <div className={styles.orderDelivery}>
                <span className={styles.orderDeliveryLabel}>Доставка:</span>
                <span className={styles.orderDeliveryValue}>
                  {o.city}
                  {o.address ? `, ${o.address}` : ""}
                  {o.zip ? `, ${o.zip}` : ""}
                </span>
              </div>
              <div className={styles.orderRecipient}>
                <span className={styles.orderDeliveryLabel}>Отримувач:</span>
                <span className={styles.orderDeliveryValue}>
                  {o.recipient_last_name} {o.recipient_first_name} · {o.phone}
                </span>
              </div>
              <div className={styles.orderTotalsRow}>
                <div className={styles.orderTotalsLeft}>
                  {o.delivery_cost > 0 && (
                    <span className={styles.orderDeliveryCost}>
                      + доставка {formatPrice(o.delivery_cost)} ₴
                    </span>
                  )}
                </div>
                <div className={styles.orderTotalsRight}>
                  <span className={styles.orderTotalLabel}>Разом:</span>
                  <span className={styles.orderTotalValue}>{formatPrice(o.total)} ₴</span>
                </div>
              </div>
              {o.status !== "cancelled" && (
                <div className={styles.orderActions}>
                  {o.status === "delivered" && (
                    <button
                      type="button"
                      className={styles.orderActionPrimary}
                      data-testid="order-repeat"
                    >
                      Повторити замовлення
                    </button>
                  )}
                  {o.status === "in_progress" && o.carrier === "novaposhta" && o.ttn && (
                    <a
                      href={`https://novaposhta.ua/tracking/?cargo_number=${o.ttn}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.orderActionPrimary}
                      data-testid="order-track"
                    >
                      Відстежити посилку
                    </a>
                  )}
                  <button type="button" className={styles.orderActionSecondary}>
                    Деталі
                  </button>
                </div>
              )}
            </footer>
          </article>
        ))}
      </div>
    </ProfileLayout>
  );
};

/* ----- StatusBadge ----- */
const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span
    className={`${styles.orderStatus} ${
      status === "delivered"
        ? styles.orderStatusDelivered
        : status === "cancelled"
        ? styles.orderStatusCancelled
        : styles.orderStatusInProgress
    }`}
    data-testid="order-status"
  >
    <span className={styles.orderStatusDot} />
    {STATUS_LABEL[status]}
  </span>
);

/* ----- Ukrainian plural ----- */
function pluralUa(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export default ProfileOrders;
