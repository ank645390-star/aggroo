import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import styles from "./CartDrawer.module.css";

/* ============================================================
   Cart Drawer — 640 × 848 slide-in panel from the right.
   Two states:
     • EMPTY: centered illustration + "Ваш кошик ПУСТИЙ" + caption
     • FULL : list of items + cross-sell row + footer with totals
   ============================================================ */

/* Static cross-sell recommendations — shown only when cart is not empty */
const CROSS_SELL = [
  {
    id: "cs-ksaladan-5l",
    productId: "ksaladan",
    name: "Ксаладан",
    category: "макро та мікроелементи",
    volume: "5 Л",
    price: 420,
    image: "/anna-50943-Professional-product-photography-of-two-white-plasti-4ffaac4d-31d8-4737-a67c-0797b0e7f397-1@2x.webp",
  },
  {
    id: "cs-plantonit-5l",
    productId: "plantonit-fruit",
    name: "Plantonit Fruit",
    category: "макро та мікроелементи",
    volume: "5 Л",
    price: 480,
    image: "/Frame-1@3x.webp",
  },
] as const;

const CloseIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M5 5L15 15M15 5L5 15" stroke="#2C2C27" strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const MinusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6.25 10H13.75" stroke="#2C2C27" strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const PlusIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 6.25V10M10 10V13.75M10 10H13.75M10 10H6.25" stroke="#2C2C27" strokeWidth="2" strokeLinecap="square" />
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3.33 5h13.33M8.33 8.33v5M11.67 8.33v5M4.17 5l.83 10c.07.92.84 1.67 1.77 1.67h6.46c.93 0 1.7-.75 1.77-1.67L15.83 5M7.5 5V3.33c0-.46.37-.83.83-.83h3.34c.46 0 .83.37.83.83V5"
      stroke="#93928C"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ====================== Cart Item (full row) ====================== */
type CartLineProps = {
  id: string;
  name: string;
  category?: string;
  volume?: string;
  price: number;
  quantity: number;
  image: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};
const CartLine: React.FC<CartLineProps> = ({
  name,
  category,
  volume,
  price,
  quantity,
  image,
  onIncrement,
  onDecrement,
  onRemove,
}) => (
  <article className={styles.itemCard} data-testid="cart-item">
    <div className={styles.itemImage}>
      <img loading="lazy" decoding="async" src={image} alt={name} />
    </div>
    <div className={styles.itemBody}>
      <div className={styles.itemHeader}>
        <h3 className={styles.itemName}>{name}</h3>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onRemove}
          aria-label="Видалити товар"
          data-testid="cart-item-remove"
        >
          <TrashIcon />
        </button>
      </div>

      {category && <p className={styles.itemCategory}>{category}</p>}

      {volume && (
        <div className={styles.itemMeta}>
          <span className={styles.itemDot} />
          <span className={styles.itemVolume}>Тара: {volume}</span>
        </div>
      )}

      <div className={styles.itemFooter}>
        <div className={styles.itemPrice}>
          {(price * quantity).toLocaleString("uk-UA")} ₴
        </div>
        <div className={styles.counter}>
          <button
            type="button"
            className={styles.counterBtn}
            onClick={onDecrement}
            aria-label="Зменшити кількість"
            data-testid="cart-item-decrement"
          >
            <MinusIcon />
          </button>
          <span className={styles.counterValue} data-testid="cart-item-qty">
            {quantity}
          </span>
          <button
            type="button"
            className={styles.counterBtn}
            onClick={onIncrement}
            aria-label="Збільшити кількість"
            data-testid="cart-item-increment"
          >
            <PlusIcon />
          </button>
        </div>
      </div>
    </div>
  </article>
);

/* ====================== Cross-sell card (compact) ====================== */
type CrossSellCardProps = {
  name: string;
  category: string;
  volume: string;
  price: number;
  image: string;
  onAdd: () => void;
};
const CrossSellCard: React.FC<CrossSellCardProps> = ({
  name,
  category,
  volume,
  price,
  image,
  onAdd,
}) => (
  <article className={styles.crossCard}>
    <div className={styles.crossImage}>
      <img loading="lazy" decoding="async" src={image} alt={name} />
    </div>
    <div className={styles.crossBody}>
      <h4 className={styles.crossName}>{name}</h4>
      <p className={styles.crossCategory}>{category}</p>
      <div className={styles.crossMeta}>
        <span className={styles.itemDot} />
        <span className={styles.itemVolume}>Тара: {volume}</span>
      </div>
      <div className={styles.crossFooter}>
        <div className={styles.crossPrice}>{price} ₴</div>
        <button
          type="button"
          className={styles.crossAddBtn}
          onClick={onAdd}
          aria-label={`Додати ${name} в кошик`}
          data-testid="cart-crosssell-add"
        >
          <span>Додати</span>
          <PlusIcon />
        </button>
      </div>
    </div>
  </article>
);

/* =============================== Main =============================== */
const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    isOpen,
    count,
    closeCart,
    increment,
    decrement,
    removeItem,
    addItem,
    total,
  } = useCart();

  const empty = items.length === 0;

  const goToCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={[styles.backdrop, isOpen ? styles.backdropOpen : ""].join(" ")}
        onClick={closeCart}
        aria-hidden={!isOpen}
      />

      {/* Drawer */}
      <aside
        className={[
          styles.drawer,
          isOpen ? styles.drawerOpen : "",
          empty ? styles.drawerEmpty : "",
        ].join(" ")}
        aria-hidden={!isOpen}
        aria-label="Кошик"
        role="dialog"
        data-testid="cart-drawer"
      >
        {/* HEADER 60px */}
        <header className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>
            Кошик
            <span className={styles.drawerCount} data-testid="cart-header-count">
              ({count})
            </span>
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={closeCart}
            aria-label="Закрити кошик"
            data-testid="cart-close"
          >
            <CloseIcon />
          </button>
        </header>

        {empty ? (
          /* ----------------- EMPTY STATE -----------------
             По дизайну: без ілюстрації — тільки заголовок,
             підпис і CTA закріплений знизу drawer.            */
          <section className={styles.emptyWrap} data-testid="cart-empty-state">
            <div className={styles.emptyInner}>
              <h3 className={styles.emptyHeadlineRow}>
                <span className={styles.emptyHeadlineBold}>Ваш кошик</span>
                <span className={styles.emptyHeadlineLight}>пустий</span>
              </h3>
              <p className={styles.emptyCaption}>
                Не знаєте звідки почати?
                <br />
                Дослідіть наш каталог
              </p>
            </div>
            <Link
              to="/catalog"
              onClick={closeCart}
              className={styles.emptyCta}
              data-testid="cart-empty-cta"
            >
              <span>Продовжити покупки</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 10h12M11 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </section>
        ) : (
          /* ----------------- FULL STATE ----------------- */
          <div className={styles.fullWrap}>
            <div className={styles.itemsList} data-testid="cart-items-list">
              {items.map((it) => (
                <CartLine
                  key={it.id}
                  id={it.id}
                  name={it.name}
                  category={it.category}
                  volume={it.volume}
                  price={it.price}
                  quantity={it.quantity}
                  image={it.image}
                  onIncrement={() => increment(it.id)}
                  onDecrement={() => decrement(it.id)}
                  onRemove={() => removeItem(it.id)}
                />
              ))}
            </div>

            {/* Cross-sell ("Часто купують разом") */}
            <section className={styles.crossSell}>
              <h3 className={styles.crossSellTitle}>Часто купують разом</h3>
              <div className={styles.crossSellList}>
                {CROSS_SELL.map((p) => (
                  <CrossSellCard
                    key={p.id}
                    name={p.name}
                    category={p.category}
                    volume={p.volume}
                    price={p.price}
                    image={p.image}
                    onAdd={() =>
                      addItem({
                        id: `${p.productId}-${p.volume}`,
                        productId: p.productId,
                        name: p.name,
                        category: p.category,
                        volume: p.volume,
                        price: p.price,
                        image: p.image,
                      })
                    }
                  />
                ))}
              </div>
            </section>

            {/* Footer with total + CTA */}
            <footer className={styles.totalsRow}>
              <div className={styles.totalsLine}>
                <span className={styles.totalsLabel}>Разом:</span>
                <span className={styles.totalsValue} data-testid="cart-total">
                  {total.toLocaleString("uk-UA")} ₴
                </span>
              </div>
              <p className={styles.deliveryNote}>
                Безкоштовна доставка: Нова Пошта, Укрпошта
              </p>
              <button
                type="button"
                className={styles.checkoutBtn}
                data-testid="cart-checkout"
                onClick={goToCheckout}
              >
                Оформити замовлення
              </button>
            </footer>
          </div>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
