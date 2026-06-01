import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "../components/Seo";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { fetchProfile, fetchAddresses, AddressDTO } from "../lib/profile-api";
import { fetchUkrposhtaByPostcode, UPPostOffice } from "../lib/geo-api";
import { isValidEmail, isValidUaPhone, progressiveFormatUaPhone, isValidUaZip } from "../lib/profile-utils";
import CityAutocomplete from "../components/checkout/CityAutocomplete";
import WarehouseAutocomplete from "../components/checkout/WarehouseAutocomplete";
import PaymentConfirmModal from "../components/checkout/PaymentConfirmModal";
import AuthModal from "../components/auth/AuthModal";
import { useContactInfo } from "../context/ContactInfoContext";
import { previewDiscount, type PreviewResponse } from "../lib/discounts-api";
import styles from "./checkout.module.css";

/* =================================================================
   /checkout — Оформлення замовлення (revamped)

   Ключові зміни:
     • Контактні дані auto-prefill з профілю / акаунту (firstName, lastName, email, phone)
     • Авторизований користувач бачить dropdown зі своїми збереженими адресами
       з prefill primary за замовчуванням; може ввести іншу адресу вручну
     • City autocomplete — реальний Nova Poshta API (працює для обох перевізників)
     • Branch autocomplete — реальний getWarehouses НП
     • Ukrposhta — індекс 5 цифр + lookup post offices через address-classifier-ws
     • Окремий вибір оплати: накладний платіж АБО за реквізитами
       (для "за реквізитами" розкривається mock-блок з реквізитами)
     • Top-right: "Увійти / Зареєструватися" або пілюля акаунту з виходом
     • Якщо guest — inline-банер пропонує зареєструватися без блокування покупки
   ================================================================= */

type BuyerType = "individual" | "company";
type DeliveryType = "novaposhta" | "ukrposhta";
type NPMode = "branch" | "courier";
type PaymentType = "cod" | "invoice";

const Checkout: React.FC = () => {
  const { items, total, setQuantity, removeItem, clear } = useCart();
  const { user, isAuthed, logout } = useAuth();
  const { info: contactInfo } = useContactInfo();
  const navigate = useNavigate();

  /* ============ Identity (contacts) ============ */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /* ============ Buyer / Delivery / Payment ============ */
  const [buyerType, setBuyerType] = useState<BuyerType>("individual");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("novaposhta");
  const [npMode, setNpMode] = useState<NPMode>("branch");
  const [paymentType, setPaymentType] = useState<PaymentType>("cod");

  /* ============ Address fields ============ */
  const [city, setCity] = useState("");
  const [cityRef, setCityRef] = useState<string>("");

  // Nova Poshta — branch
  const [warehouse, setWarehouse] = useState("");

  // Nova Poshta — courier
  const [street, setStreet] = useState(""); // вул, буд, кв

  // Ukrposhta
  const [upStreet, setUpStreet] = useState("");
  const [upZip, setUpZip] = useState("");
  const [upPostOffices, setUpPostOffices] = useState<UPPostOffice[]>([]);

  /* ============ Misc ============ */
  const [comment, setComment] = useState("");
  const [callBack, setCallBack] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  /* ============ Auth modal ============ */
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: "login" | "register" }>({ open: false, tab: "login" });

  /* ============ Payment confirmation flow ============ */
  const [paymentModal, setPaymentModal] = useState(false);
  const [cardSuccess, setCardSuccess] = useState<null | { type: PaymentType; ref?: string }>(null);

  /* ============ Saved addresses (authed) ============ */
  const [savedAddresses, setSavedAddresses] = useState<AddressDTO[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  /* ============================================================
     1) AUTO-PREFILL contacts from profile/auth
     ============================================================ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isAuthed && user) {
        if (!cancelled) {
          setFirstName(user.firstName || "");
          setLastName(user.lastName || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
        }
        return;
      }
      // Guest: try profile (session-based)
      try {
        const p = await fetchProfile();
        if (cancelled) return;
        if (p.firstName) setFirstName(p.firstName);
        if (p.lastName) setLastName(p.lastName);
        if (p.email) setEmail(p.email);
        if (p.phone) setPhone(p.phone);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [isAuthed, user]);

  /* ============================================================
     2) Saved addresses for authed users
     ============================================================ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthed) {
        setSavedAddresses([]);
        setSelectedAddressId("");
        return;
      }
      try {
        const items = await fetchAddresses();
        if (cancelled) return;
        setSavedAddresses(items);
        // Auto-select primary or first
        const primary = items.find((a) => a.isPrimary) || items[0];
        if (primary) {
          applyAddress(primary);
          setSelectedAddressId(primary.id);
        }
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const applyAddress = (a: AddressDTO) => {
    setFirstName(a.firstName);
    setLastName(a.lastName);
    setPhone(a.phone);
    setCity(a.city);
    setCityRef(""); // користувач при редагуванні зможе обрати знову з автокомпліту
    setDeliveryType(a.carrier);
    if (a.carrier === "novaposhta") {
      setNpMode(a.deliveryMode || "branch");
      setWarehouse(a.branch || "");
      setStreet(a.street || "");
    } else {
      setUpStreet(a.street || "");
      setUpZip(a.zip || "");
    }
  };

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === "__new") {
      // очистимо адресні поля, контактні лишимо
      setCity(""); setCityRef("");
      setWarehouse(""); setStreet("");
      setUpStreet(""); setUpZip("");
      return;
    }
    const a = savedAddresses.find((x) => x.id === id);
    if (a) applyAddress(a);
  };

  /* ============================================================
     3) Ukrposhta — fetch post offices by ZIP (debounced)
     ============================================================ */
  useEffect(() => {
    if (deliveryType !== "ukrposhta" || !isValidUaZip(upZip)) {
      setUpPostOffices([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const list = await fetchUkrposhtaByPostcode(upZip);
      if (!cancelled) setUpPostOffices(list);
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [upZip, deliveryType]);

  /* ============================================================
     Helpers / Validation
     ============================================================ */
  const itemsCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const totalVolume = useMemo(
    () => items.reduce((s, i) => {
      const v = parseFloat(String(i.volume || "0").replace(",", "."));
      return s + (Number.isFinite(v) ? v * i.quantity : 0);
    }, 0),
    [items]
  );

  // ============================================================
  // Discount preview — реальний серверний підрахунок (правила
  // керуються в адмінці /admin/discounts; жодних хардкодів).
  // ============================================================
  const [discountPreview, setDiscountPreview] = useState<PreviewResponse | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) {
      setDiscountPreview(null);
      return;
    }
    const payload = items.map((i) => ({
      product_id: (i as any).productId || (i as any).product_id,
      slug: (i as any).slug,
      name: i.name,
      category: i.category || undefined,
      volume: i.volume || undefined,
      price: i.price,
      quantity: i.quantity,
    }));
    const t = setTimeout(() => {
      previewDiscount(payload)
        .then((r) => { if (!cancelled) setDiscountPreview(r); })
        .catch(() => { if (!cancelled) setDiscountPreview(null); });
    }, 120);   // debounce so quick +/- doesn't spam API
    return () => { cancelled = true; clearTimeout(t); };
  }, [items]);

  const discountAmount = discountPreview?.discount_total ?? 0;
  const grandTotal = discountPreview?.grand_total ?? total;
  const appliedRules = discountPreview?.applied_rules ?? [];
  const progressRules = discountPreview?.progress ?? [];
  const fmt = (n: number) => n.toLocaleString("uk-UA");

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Введіть ім'я";
    if (!lastName.trim()) e.lastName = "Введіть прізвище";
    if (!isValidEmail(email)) e.email = "Некоректна електронна пошта";
    if (!isValidUaPhone(phone)) e.phone = "Введіть коректний український номер";
    if (!city.trim()) e.city = "Виберіть населений пункт зі списку";
    if (deliveryType === "novaposhta") {
      if (npMode === "branch" && !warehouse.trim()) {
        e.warehouse = "Виберіть відділення зі списку";
      }
      if (npMode === "courier" && !street.trim()) {
        e.street = "Вкажіть вулицю та будинок";
      }
    } else {
      if (!upStreet.trim()) e.upStreet = "Вкажіть вулицю та будинок";
      if (!isValidUaZip(upZip)) e.upZip = "Індекс має містити 5 цифр";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!validate()) return;

    // Якщо оплата за реквізитами — відкриваємо повний flow підтвердження оплати.
    // Кошик НЕ очищуємо до фінального підтвердження.
    if (paymentType === "invoice") {
      setPaymentModal(true);
      return;
    }

    // COD: відразу "успіх", замовлення піде менеджеру для дзвінка.
    setSubmitting(true);
    setTimeout(async () => {
      await clear();
      setSubmitting(false);
      setCardSuccess({ type: "cod" });
    }, 600);
  };

  const handlePaymentConfirmed = async (payload: { transactionId: string; receiptName: string | null }) => {
    // Замовлення фактично "відправлено в обробку" з підтвердженням оплати.
    // В наступній ітерації — POST /api/orders з payment_status="payment_submitted".
    setPaymentModal(false);
    await clear();
    setCardSuccess({ type: "invoice", ref: payload.transactionId || payload.receiptName || undefined });
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className={styles.page}>
      <Seo title="Оформлення замовлення" canonical="/checkout" noindex />
      {/* ============ TOP ROW ============ */}
      <header className={styles.topRow}>
        <div className={styles.topRowInner}>
          <Link to="/" className={styles.backLink} data-testid="checkout-back">
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
              <path d="M7 1L1 7L7 13" stroke="#2C2C27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Повернутися до кошика</span>
          </Link>

          <Link to="/" className={styles.logoWrap} aria-label="ТАМІС АГРО — на головну">
            <img loading="lazy" decoding="async" src="/logo@2x.png" alt="ТОРГОВИЙ ДІМ ТАМІС АГРО" width={128} height={90} />
          </Link>

          {/* Right slot: account pill OR login/register */}
          {isAuthed && user ? (
            <div className={styles.accountPill} data-testid="checkout-account-pill">
              <span className={styles.accountAvatar}>
                {(user.firstName?.[0] || "?").toUpperCase()}{(user.lastName?.[0] || "").toUpperCase()}
              </span>
              <span className={styles.accountName}>{user.firstName} {user.lastName}</span>
              <button type="button" className={styles.accountLogout} onClick={logout} data-testid="checkout-logout">Вихід</button>
            </div>
          ) : (
            <div className={styles.authButtons}>
              <button type="button" className={styles.loginBtn} onClick={() => setAuthModal({ open: true, tab: "login" })} data-testid="checkout-login-trigger">Увійти</button>
              <button type="button" className={styles.registerBtn} onClick={() => setAuthModal({ open: true, tab: "register" })} data-testid="checkout-register">
                <svg width="15" height="17" viewBox="0 0 15 17" fill="none" aria-hidden="true">
                  <circle cx="7.5" cy="4.5" r="3.5" stroke="#2C2C27" strokeWidth="1.5"/>
                  <path d="M1 16C1 12.6863 3.91015 10 7.5 10C11.0899 10 14 12.6863 14 16" stroke="#2C2C27" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Зареєструватися</span>
              </button>
            </div>
          )}
        </div>
        <div className={styles.topRowDivider} />
      </header>

      {/* ============ MAIN ============ */}
      <main className={styles.main}>
        <div className={styles.container}>

          {/* ---- LEFT COLUMN: form ---- */}
          <form className={styles.leftColumn} onSubmit={handleSubmit} noValidate>
            <h1 className={styles.h1}>Оформлення замовлення</h1>

            {/* (Старий inline auth-prompt прибрано: дублював верхні кнопки.
                Реєстрація / вхід — лише через top-right slot або
                автоматичний CTA з підвалу при guest-checkout. Залишаємо
                одну єдину UI-логіку.) */}

            <div className={styles.formCard}>

              {/* ===== CONTACTS ===== */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Контактні дані</h2>
                <div className={styles.fieldGrid2}>
                  <Field label="Ім'я" required value={firstName} onChange={setFirstName}
                         placeholder="Введіть ім'я" error={errors.firstName} testId="checkout-first-name" />
                  <Field label="Прізвище" required value={lastName} onChange={setLastName}
                         placeholder="Введіть прізвище" error={errors.lastName} testId="checkout-last-name" />
                </div>
                <Field label="Пошта" required type="email" value={email} onChange={setEmail}
                       placeholder="example@email.com" error={errors.email} testId="checkout-email" />
                <Field label="Телефон" required type="tel" value={phone}
                       onChange={(v) => setPhone(progressiveFormatUaPhone(v))}
                       placeholder="+380 (XX) XXX XX XX" error={errors.phone} testId="checkout-phone"
                       maxLength={19} />
              </section>

              {/* ===== SAVED ADDRESSES (authed) ===== */}
              {isAuthed && savedAddresses.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>Куди доставити?</h2>
                  <p className={styles.sectionHint}>Виберіть збережену адресу або введіть нову.</p>
                  <div className={styles.addrChoiceList} data-testid="checkout-saved-addresses">
                    {savedAddresses.map((a) => (
                      <label key={a.id} className={`${styles.addrChoice} ${selectedAddressId === a.id ? styles.addrChoiceActive : ""}`}>
                        <input
                          type="radio"
                          name="savedAddr"
                          checked={selectedAddressId === a.id}
                          onChange={() => handleSelectAddress(a.id)}
                          className={styles.addrChoiceInput}
                          data-testid={`saved-addr-${a.id}`}
                        />
                        <div className={styles.addrChoiceBody}>
                          <div className={styles.addrChoiceHead}>
                            <span className={styles.addrChoiceTitle}>{a.title}</span>
                            {a.isPrimary && <span className={styles.addrChoiceTag}>Основна</span>}
                            <span className={a.carrier === "novaposhta" ? styles.addrCarrierNP : styles.addrCarrierUP}>
                              {a.carrier === "novaposhta" ? "Нова Пошта" : "Укр Пошта"}
                            </span>
                          </div>
                          <div className={styles.addrChoiceLines}>
                            <span>{a.lastName} {a.firstName} · {a.phone}</span>
                            <span>
                              {a.city}{" · "}
                              {a.carrier === "novaposhta"
                                ? (a.deliveryMode === "courier" ? a.street : a.branch)
                                : `${a.street}, ${a.zip}`}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                    <label className={`${styles.addrChoice} ${styles.addrChoiceNew} ${selectedAddressId === "__new" ? styles.addrChoiceActive : ""}`}>
                      <input
                        type="radio"
                        name="savedAddr"
                        checked={selectedAddressId === "__new"}
                        onChange={() => handleSelectAddress("__new")}
                        className={styles.addrChoiceInput}
                        data-testid="saved-addr-new"
                      />
                      <span className={styles.addrChoiceNewLabel}>+ Ввести іншу адресу</span>
                    </label>
                  </div>
                </section>
              )}

              {/* ===== BUYER TYPE ===== */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Тип покупця</h2>
                <div className={styles.radioGroup}>
                  <RadioRow name="buyerType" checked={buyerType === "individual"} onChange={() => setBuyerType("individual")} label="Фізична особа" testId="checkout-buyer-individual" />
                  <RadioRow name="buyerType" checked={buyerType === "company"} onChange={() => setBuyerType("company")} label="Юридична особа" testId="checkout-buyer-company" />
                </div>
              </section>

              {/* ===== DELIVERY ===== */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Доставка</h2>

                <div className={styles.carrierTabs} role="tablist">
                  <button type="button" role="tab"
                          aria-selected={deliveryType === "novaposhta"}
                          className={`${styles.carrierTab} ${deliveryType === "novaposhta" ? styles.carrierTabActive : ""}`}
                          onClick={() => setDeliveryType("novaposhta")}
                          data-testid="checkout-delivery-novaposhta">
                    Нова Пошта
                  </button>
                  <button type="button" role="tab"
                          aria-selected={deliveryType === "ukrposhta"}
                          className={`${styles.carrierTab} ${deliveryType === "ukrposhta" ? styles.carrierTabActive : ""}`}
                          onClick={() => setDeliveryType("ukrposhta")}
                          data-testid="checkout-delivery-ukrposhta">
                    Укр Пошта
                  </button>
                </div>

                {/* City autocomplete — used for both carriers */}
                <CityAutocomplete
                  label="Населений пункт"
                  required
                  value={city}
                  onChange={(name, ref) => { setCity(name); setCityRef(ref || ""); setWarehouse(""); }}
                  placeholder="Почніть вводити: Київ, Львів, с. Шевченкове…"
                  error={errors.city}
                  testId="checkout-city"
                />

                {/* Nova Poshta block */}
                {deliveryType === "novaposhta" && (
                  <>
                    <div className={styles.modeRow}>
                      <RadioRow name="npMode" checked={npMode === "branch"} onChange={() => setNpMode("branch")} label="У відділення / поштомат" testId="np-mode-branch" />
                      <RadioRow name="npMode" checked={npMode === "courier"} onChange={() => setNpMode("courier")} label="Кур'єрська доставка" testId="np-mode-courier" />
                    </div>

                    {npMode === "branch" ? (
                      <WarehouseAutocomplete
                        label="Відділення Нової Пошти"
                        required
                        cityRef={cityRef}
                        value={warehouse}
                        onChange={(label) => setWarehouse(label)}
                        placeholder="Введіть номер (напр., 1) або вулицю"
                        error={errors.warehouse}
                        testId="checkout-warehouse"
                      />
                    ) : (
                      <Field label="Вулиця, будинок, кв." required value={street} onChange={setStreet}
                             placeholder="вул. Шевченка 12, кв. 5"
                             error={errors.street} testId="checkout-np-street" />
                    )}
                  </>
                )}

                {/* Ukrposhta block */}
                {deliveryType === "ukrposhta" && (
                  <>
                    <Field label="Вулиця, будинок, кв." required value={upStreet} onChange={setUpStreet}
                           placeholder="вул. Київська 135, кв. 12"
                           error={errors.upStreet} testId="checkout-up-street" />
                    <div className={styles.fieldGrid2}>
                      <Field label="Поштовий індекс" required value={upZip}
                             onChange={(v) => setUpZip(v.replace(/\D/g, "").slice(0, 5))}
                             placeholder="00000" maxLength={5} inputMode="numeric"
                             error={errors.upZip} testId="checkout-up-zip" />
                      {upPostOffices.length > 0 && (
                        <div className={styles.upInfoBox} data-testid="up-postoffice-info">
                          <div className={styles.upInfoTitle}>Відділення Укрпошти</div>
                          <div className={styles.upInfoText}>
                            {upPostOffices[0].name || upPostOffices[0].address || `Індекс ${upPostOffices[0].postcode}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>

              {/* ===== PAYMENT ===== */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Оплата</h2>
                <div className={styles.radioGroup}>
                  <RadioRow name="payment" checked={paymentType === "cod"} onChange={() => setPaymentType("cod")} label="Накладний платіж (при отриманні)" testId="checkout-pay-cod" />
                  <RadioRow name="payment" checked={paymentType === "invoice"} onChange={() => setPaymentType("invoice")} label="За реквізитами (безготівковий розрахунок)" testId="checkout-pay-invoice" />
                </div>
                {paymentType === "invoice" && (
                  <div className={styles.requisitesBox} data-testid="checkout-requisites">
                    <div className={styles.requisitesTitle}>Реквізити для оплати</div>
                    <ul className={styles.requisitesList}>
                      <li><span>Одержувач:</span> ТОВ «ТОРГОВИЙ ДІМ ТАМІС АГРО»</li>
                      <li><span>ЄДРПОУ:</span> 12345678</li>
                      <li><span>IBAN:</span> UA00 0000 0000 0000 0000 0000 000</li>
                      <li><span>Банк:</span> АТ КБ «ПриватБанк»</li>
                      <li><span>Призначення:</span> Оплата за товар згідно замовлення</li>
                    </ul>
                    <p className={styles.requisitesHint}>
                      Рахунок-фактура буде надіслано на пошту після оформлення замовлення.
                    </p>
                  </div>
                )}
              </section>

              {/* ===== COMMENT ===== */}
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Коментар до замовлення</h2>
                <div className={styles.commentWrap}>
                  <label className={styles.fieldLabel}>Коментар</label>
                  <div className={styles.fieldBox}>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      value={comment}
                      placeholder="Напишіть ваш коментар..."
                      onChange={(e) => setComment(e.target.value)}
                      data-testid="checkout-comment"
                    />
                  </div>
                </div>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={callBack}
                    onChange={(e) => setCallBack(e.target.checked)}
                    data-testid="checkout-callback"
                  />
                  <span>Передзвонити для уточнення деталей замовлення</span>
                </label>
              </section>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={items.length === 0 || submitting}
              data-testid="checkout-submit"
            >
              <span>{submitting ? "Відправляємо…" : "Оформити замовлення"}</span>
              <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true">
                <path d="M1 6H13M13 6L8 1M13 6L8 11" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>

          {/* ---- RIGHT COLUMN: order summary ---- */}
          <aside className={styles.rightColumn}>
            <div className={styles.summaryCard} data-testid="checkout-summary">
              <h2 className={styles.summaryTitle}>Ваші товари ({items.length})</h2>
              <div className={styles.summaryBody}>
                {items.length === 0 ? (
                  <div className={styles.emptyState}>
                    Ваш кошик порожній.&nbsp;
                    <Link to="/catalog" className={styles.emptyLink}>Перейти до каталогу →</Link>
                  </div>
                ) : (
                  <>
                    <ul className={styles.itemList}>
                      {items.map((it) => {
                        const line = it.price * it.quantity;
                        const v = parseFloat(String(it.volume || "0").replace(",", "."));
                        return (
                          <li key={it.id} className={styles.itemRow} data-testid="summary-item">
                            <div className={styles.itemImage}>
                              <img loading="lazy" decoding="async" src={it.image} alt={it.name} width={134} height={130} />
                            </div>
                            <div className={styles.itemBody}>
                              <div className={styles.itemTop}>
                                <div className={styles.itemTextBlock}>
                                  <div className={styles.itemName}>{it.name}</div>
                                  <div className={styles.itemDesc}>{it.category}</div>
                                </div>
                                <div className={styles.itemPrice}>{fmt(line)} ₴</div>
                                <button type="button" className={styles.itemRemove} onClick={() => removeItem(it.id)} aria-label="Видалити товар">
                                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M5 6l1 11a2 2 0 002 2h4a2 2 0 002-2l1-11" stroke="#2C2C27" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9 10v6M11 10v6" stroke="#2C2C27" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                </button>
                              </div>
                              <div className={styles.itemMeta}>
                                <span className={styles.metaTag}><span className={styles.dot} /> Тара: {it.volume || "—"}</span>
                                <span className={styles.metaTag}><span className={styles.metaX}>x</span>Кіл-ть: {it.quantity} од</span>
                              </div>
                              <div className={styles.itemFooter}>
                                <div className={styles.counter}>
                                  <button type="button" className={styles.counterBtn} onClick={() => setQuantity(it.id, Math.max(1, it.quantity - 1))} aria-label="Зменшити" data-testid="summary-decrement">−</button>
                                  <span className={styles.counterValue}>{it.quantity}</span>
                                  <button type="button" className={styles.counterBtn} onClick={() => setQuantity(it.id, it.quantity + 1)} aria-label="Збільшити" data-testid="summary-increment">+</button>
                                </div>
                                <div className={styles.itemUnitPrice}>{fmt(it.price)} ₴{v ? `/${v} л` : ""}</div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div className={styles.totalsBlock}>
                      <div className={styles.totalsRow}>
                        <span>Товари ({itemsCount} шт.)</span>
                        <span>{fmt(total)} ₴</span>
                      </div>
                      <div className={styles.totalsRow}>
                        <span className={styles.deliveryInfo}>Доставка: Розрахується після вибору</span>
                      </div>

                      {/* Динамічні рядки знижок — керуються з адмінки /admin/discounts.
                          Показуємо рядок для кожного активного правила: коли поріг
                          ще не досягнуто — рядок неактивний (підказка), коли досягнуто —
                          показуємо суму знижки. */}
                      {progressRules.map((rule) => {
                        const applied = appliedRules.find((a) => a.id === rule.id);
                        return (
                          <div
                            key={rule.id}
                            className={`${styles.totalsRow} ${styles.totalsRowDiscount}`}
                            data-testid={`discount-row-${rule.id}`}
                          >
                            <span className={styles.discountInfo}>{rule.label || rule.name}</span>
                            <span className={rule.eligible ? styles.discountActive : styles.discountInactive}>
                              Знижка {rule.percent}%
                              {applied && applied.amount > 0
                                ? ` · −${fmt(applied.amount)} ₴`
                                : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              {items.length > 0 && (
                <div className={styles.grandTotal}>
                  <span>Разом:</span>
                  <span>{fmt(grandTotal)} ₴</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <footer className={styles.helpFooter}>
        <div className={styles.helpInner}>
          <h3 className={styles.helpTitle}>Виникли труднощі?</h3>
          <p className={styles.helpDesc}>
            Відділ турботи за клієнтами радий вам допомогти<br />
            у будні дні з 9 до 19, у вихідні та святкові — з 10 до 18
          </p>
          <a href={`tel:${contactInfo.phone_primary_tel}`} className={styles.helpPhone}>{contactInfo.phone_primary}</a>
        </div>
      </footer>

      {/* ============ AUTH MODAL ============ */}
      <AuthModal
        open={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal({ ...authModal, open: false })}
      />

      {/* ============ PAYMENT CONFIRMATION MODAL (invoice flow) ============ */}
      <PaymentConfirmModal
        open={paymentModal}
        amount={grandTotal}
        onClose={() => setPaymentModal(false)}
        onFinalConfirm={handlePaymentConfirmed}
      />

      {/* ============ COD SUCCESS OVERLAY ============ */}
      {cardSuccess && cardSuccess.type === "cod" && (
        <div className={styles.successOverlay} role="dialog" aria-modal="true" data-testid="cod-success">
          <div className={styles.successCard}>
            <div className={styles.successCheck} aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#e7ebe7" stroke="#1b4332" strokeWidth="2"/>
                <path d="M18 30L26 38L42 22" stroke="#1b4332" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.successTitle}>Замовлення прийнято</h2>
            <p className={styles.successText}>
              Дякуємо за замовлення!<br />
              Менеджер зв'яжеться з вами найближчим часом для уточнення деталей доставки.
              Оплата — при отриманні (накладний платіж).
            </p>
            <button type="button" className={styles.successBtn} onClick={() => navigate("/")}>На головну</button>
          </div>
        </div>
      )}
      {cardSuccess && cardSuccess.type === "invoice" && (
        <div className={styles.successOverlay} role="dialog" aria-modal="true" data-testid="invoice-success">
          <div className={styles.successCard}>
            <div className={styles.successCheck} aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" fill="#e7ebe7" stroke="#1b4332" strokeWidth="2"/>
                <path d="M18 30L26 38L42 22" stroke="#1b4332" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className={styles.successTitle}>Оплату прийнято в обробку</h2>
            <p className={styles.successText}>
              Ваше підтвердження отримано. Після перевірки менеджер зв'яжеться з вами для уточнення доставки.<br />
              {cardSuccess.ref && <>Референс: <strong>{cardSuccess.ref}</strong></>}
            </p>
            <button type="button" className={styles.successBtn} onClick={() => navigate("/")}>На головну</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   Sub-components
   ============================================================ */
type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  testId?: string;
  required?: boolean;
  inputMode?: "text" | "numeric" | "tel" | "email" | "search";
  maxLength?: number;
};

const Field: React.FC<FieldProps> = ({
  label, value, onChange, placeholder, type = "text", error, testId, required, inputMode, maxLength,
}) => (
  <div className={styles.fieldWrap} data-error={error ? "true" : "false"}>
    <label className={styles.fieldLabel}>
      {label}
      {required && <span className={styles.fieldRequired} aria-hidden="true"> *</span>}
    </label>
    <div className={styles.fieldBox}>
      <input
        type={type}
        className={styles.fieldInput}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-required={required ? "true" : undefined}
        autoComplete="off"
      />
    </div>
    {error && <div className={styles.fieldError}>{error}</div>}
  </div>
);

const RadioRow: React.FC<{
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  testId?: string;
}> = ({ name, checked, onChange, label, testId }) => (
  <label className={styles.radioRow}>
    <input
      type="radio"
      name={name}
      checked={checked}
      onChange={onChange}
      className={styles.radioInput}
      data-testid={testId}
    />
    <span className={styles.radioLabel}>{label}</span>
  </label>
);

export default Checkout;
