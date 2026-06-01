import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import Seo from "../components/Seo";
import ProfileLayout from "./profile-layout";
import SuccessToast from "../components/ui-extras/SuccessToast";
import ConfirmModal from "../components/ui-extras/ConfirmModal";
import {
  isValidUaPhone,
  isValidUaZip,
  progressiveFormatUaPhone,
  formatUaPhone,
  normalizeUaPhone,
} from "../lib/profile-utils";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  fetchProfile,
  updateProfile,
  AddressDTO,
  Carrier,
  DeliveryMode,
  ProfileDTO,
} from "../lib/profile-api";
import styles from "./profile.module.css";

/* =====================================================================
   /profile/addresses — Адреси доставки
   • Реальний backend: GET/POST/PUT/DELETE /api/addresses/...
   • Модалка через ReactDOM.createPortal у document.body, щоб обійти
     батьківський transform: scale(...) і центрувати по viewport.
   • Нова Пошта прогресивний флоу:
       1) Прізвище / Ім'я
       2) Місто
       3) (з'являється після Міста) Номер відділення  АБО (якщо «Кур'єрська») Вулиця/будинок
       4) Телефон
       5) Чекбокс «Кур'єрська доставка»
     Поле «Назва адреси» — у верхній частині (як заголовок-карточка).
   • Укрпошта флоу:
       1) Прізвище / Ім'я
       2) Місто
       3) Вулиця, будинок, кв.
       4) Поштовий індекс (5 цифр)
       5) Телефон
   ===================================================================== */

type Draft = {
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  // NP
  deliveryMode: DeliveryMode;
  branch: string;
  // UP + NP courier
  street: string;
  zip: string;
  isPrimary: boolean;
};

const emptyDraft = (isPrimary: boolean): Draft => ({
  title: "",
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  deliveryMode: "branch",
  branch: "",
  street: "",
  zip: "",
  isPrimary,
});

const ProfileAddresses: React.FC = () => {
  const [addresses, setAddresses] = useState<AddressDTO[]>([]);
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<
    | { mode: "add"; carrier: Carrier }
    | { mode: "edit"; id: string; carrier: Carrier }
    | null
  >(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft(false));
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [toast, setToast] = useState<{ open: boolean; msg: string }>({ open: false, msg: "" });

  /* ---------------- load ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [items, p] = await Promise.all([
          fetchAddresses(),
          fetchProfile().catch(() => null),
        ]);
        if (!cancelled) {
          setAddresses(items);
          if (p) setProfile(p);
        }
      } catch (err) {
        console.warn("[addresses] load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------------- modal control ---------------- */
  /**
   * Відкриваючи "Додати адресу", автоматично підтягуємо ім'я, прізвище і
   * телефон з профілю користувача — це його за-замовчуванням контактні
   * дані. Користувач може їх переписати у формі (наприклад, інший отримувач).
   *
   * При першій адресі — вона автоматично стає основною (isPrimary=true).
   */
  const openAdd = (carrier: Carrier = "novaposhta") => {
    const base = emptyDraft(addresses.length === 0);
    if (profile) {
      base.firstName = profile.firstName || "";
      base.lastName = profile.lastName || "";
      base.phone = profile.phone || "";
    }
    setDraft(base);
    setErrors({});
    setModal({ mode: "add", carrier });
  };

  const openEdit = (a: AddressDTO) => {
    setDraft({
      title: a.title,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      city: a.city,
      deliveryMode: a.deliveryMode || "branch",
      branch: a.branch || "",
      street: a.street || "",
      zip: a.zip || "",
      isPrimary: a.isPrimary,
    });
    setErrors({});
    setModal({ mode: "edit", id: a.id, carrier: a.carrier });
  };

  const closeModal = () => {
    setModal(null);
    setErrors({});
  };

  const switchCarrier = (carrier: Carrier) => {
    if (!modal) return;
    if (modal.mode === "add") setModal({ mode: "add", carrier });
    else setModal({ ...modal, carrier });
    setErrors({});
  };

  /* ---------------- validation ---------------- */
  const validate = (carrier: Carrier): boolean => {
    const e: Partial<Record<keyof Draft, string>> = {};
    if (!draft.title.trim()) e.title = "Вкажіть назву адреси";
    if (!draft.firstName.trim()) e.firstName = "Введіть ім'я";
    if (!draft.lastName.trim()) e.lastName = "Введіть прізвище";
    if (!draft.city.trim()) e.city = "Вкажіть місто";
    if (!isValidUaPhone(draft.phone)) e.phone = "Некоректний номер";
    if (carrier === "novaposhta") {
      if (draft.deliveryMode === "branch") {
        if (!draft.branch.trim()) e.branch = "Вкажіть номер або адресу відділення";
      } else {
        if (!draft.street.trim()) e.street = "Вкажіть вулицю та будинок";
      }
    } else {
      if (!draft.street.trim()) e.street = "Вкажіть вулицю та будинок";
      if (!isValidUaZip(draft.zip)) e.zip = "Індекс має містити 5 цифр";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ---------------- save ---------------- */
  const saveDraft = async () => {
    if (!modal) return;
    const carrier = modal.carrier;
    if (!validate(carrier)) return;

    const normalizedPhone = formatUaPhone(normalizeUaPhone(draft.phone) || "");
    const isFirst = addresses.length === 0;

    const payload: Omit<AddressDTO, "id"> = {
      carrier,
      title: draft.title.trim(),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      phone: normalizedPhone,
      city: draft.city.trim(),
      isPrimary: draft.isPrimary || isFirst,
      ...(carrier === "novaposhta"
        ? {
            deliveryMode: draft.deliveryMode,
            branch: draft.deliveryMode === "branch" ? draft.branch.trim() : null,
            street: draft.deliveryMode === "courier" ? draft.street.trim() : null,
          }
        : {
            street: draft.street.trim(),
            zip: draft.zip.trim(),
          }),
    };

    setSubmitting(true);
    try {
      const items =
        modal.mode === "add"
          ? await createAddress(payload)
          : await updateAddress(modal.id, payload);
      setAddresses(items);

      /* ------------------------------------------------------------------
         Двосторонній зв'язок Профіль ↔ Адреса:
         Якщо ця адреса позначена як основна (або це перша створена), значить
         користувач підтверджує: «моя контактна особа — саме ця». Тому ми
         тихо синхронізуємо firstName/lastName/phone у профіль, щоб дані
         в розділі "Особисті дані" були завжди актуальними.

         Email НЕ оновлюється з адреси (його там немає).
         ------------------------------------------------------------------ */
      const becamePrimary = payload.isPrimary === true;
      if (becamePrimary) {
        const needSync =
          !profile ||
          profile.firstName !== payload.firstName ||
          profile.lastName !== payload.lastName ||
          profile.phone !== payload.phone;
        if (needSync) {
          try {
            const updated = await updateProfile({
              firstName: payload.firstName,
              lastName: payload.lastName,
              phone: payload.phone,
            });
            setProfile(updated);
          } catch (e) {
            // не критично — продовжуємо
            console.warn("[addresses] profile silent-sync failed", e);
          }
        }
      }

      setToast({
        open: true,
        msg: modal.mode === "add" ? "Адресу додано" : "Адресу оновлено",
      });
      setModal(null);
    } catch (err: any) {
      const message = err?.response?.data?.detail || "Не вдалося зберегти адресу";
      setToast({ open: true, msg: message });
    } finally {
      setSubmitting(false);
    }
  };

  const askDelete = (id: string) => setConfirmDel({ open: true, id });
  const cancelDelete = () => setConfirmDel({ open: false, id: null });
  const doDelete = async () => {
    if (!confirmDel.id) return;
    try {
      const items = await deleteAddress(confirmDel.id);
      setAddresses(items);
      setToast({ open: true, msg: "Адресу видалено" });
    } catch (err) {
      setToast({ open: true, msg: "Не вдалося видалити" });
    } finally {
      setConfirmDel({ open: false, id: null });
    }
  };

  const carrierForRender = useMemo<Carrier | null>(
    () => (modal ? modal.carrier : null),
    [modal]
  );

  /* ============================================================ */
  return (
    <ProfileLayout breadcrumb="Адреси" title="Адреси доставки">
      <Seo title="Адреси доставки" canonical="/profile/addresses" noindex />
      <section className={styles.card}>
        <header className={styles.addressesTopRow}>
          <h3 className={styles.cardTitle}>Збережені адреси</h3>
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => openAdd("novaposhta")}
            data-testid="address-add"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2V14M2 8H14" stroke="#1B4332" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span>Додати</span>
          </button>
        </header>

        {loading ? (
          <div className={styles.ordersEmpty}>Завантажуємо…</div>
        ) : addresses.length === 0 ? (
          <div className={styles.ordersEmpty}>
            У вас ще немає збережених адрес.
          </div>
        ) : (
          <ul className={styles.addressList}>
            {addresses.map((a) => (
              <li key={a.id} className={styles.addressCard} data-testid="address-card">
                <div className={styles.addressTop}>
                  <div className={styles.addressLeft}>
                    <h3 className={styles.addressTitle}>{a.title}</h3>
                    {a.isPrimary && <span className={styles.addressTag}>Основна</span>}
                    <span
                      className={
                        a.carrier === "novaposhta"
                          ? styles.carrierBadgeNP
                          : styles.carrierBadgeUP
                      }
                      data-testid="address-carrier"
                    >
                      {a.carrier === "novaposhta"
                        ? `Нова Пошта · ${a.deliveryMode === "courier" ? "кур'єр" : "відділення"}`
                        : "Укр Пошта"}
                    </span>
                  </div>
                  <div className={styles.addressActions}>
                    <button
                      type="button"
                      className={`${styles.actionLink} ${styles.actionEdit}`}
                      onClick={() => openEdit(a)}
                      data-testid="address-edit"
                    >
                      Редагувати
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionLink} ${styles.actionDelete}`}
                      onClick={() => askDelete(a.id)}
                      data-testid="address-delete"
                    >
                      Видалити
                    </button>
                  </div>
                </div>
                <div className={styles.addressBody}>
                  <div className={styles.addressInfoRow}>
                    <span className={styles.addressInfoLabel}>Отримувач:</span>
                    <span>{a.lastName} {a.firstName}</span>
                  </div>
                  <div className={styles.addressInfoRow}>
                    <span className={styles.addressInfoLabel}>Телефон:</span>
                    <span>{a.phone}</span>
                  </div>
                  <div className={styles.addressInfoRow}>
                    <span className={styles.addressInfoLabel}>Місто:</span>
                    <span>{a.city}</span>
                  </div>
                  {a.carrier === "novaposhta" && a.deliveryMode === "branch" ? (
                    <div className={styles.addressInfoRow}>
                      <span className={styles.addressInfoLabel}>Відділення:</span>
                      <span>{a.branch}</span>
                    </div>
                  ) : a.carrier === "novaposhta" && a.deliveryMode === "courier" ? (
                    <div className={styles.addressInfoRow}>
                      <span className={styles.addressInfoLabel}>Адреса:</span>
                      <span>{a.street}</span>
                    </div>
                  ) : (
                    <>
                      <div className={styles.addressInfoRow}>
                        <span className={styles.addressInfoLabel}>Адреса:</span>
                        <span>{a.street}</span>
                      </div>
                      <div className={styles.addressInfoRow}>
                        <span className={styles.addressInfoLabel}>Індекс:</span>
                        <span>{a.zip}</span>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ============ Add/Edit Modal (Portal — outside scale wrapper) ============ */}
      {modal && carrierForRender &&
        ReactDOM.createPortal(
          <div className={styles.modalBackdrop} onClick={closeModal}>
            <div
              className={`${styles.modal} ${styles.modalWide}`}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              data-testid="address-modal"
            >
              <h2 className={styles.modalTitle}>
                {modal.mode === "add" ? "Додати адресу" : "Редагувати адресу"}
              </h2>

              {/* ===== Carrier tabs ===== */}
              <div className={styles.carrierTabs} role="tablist">
                <button
                  type="button"
                  className={`${styles.carrierTab} ${carrierForRender === "novaposhta" ? styles.carrierTabActive : ""}`}
                  onClick={() => switchCarrier("novaposhta")}
                  role="tab"
                  aria-selected={carrierForRender === "novaposhta"}
                  data-testid="tab-novaposhta"
                >
                  Нова Пошта
                </button>
                <button
                  type="button"
                  className={`${styles.carrierTab} ${carrierForRender === "ukrposhta" ? styles.carrierTabActive : ""}`}
                  onClick={() => switchCarrier("ukrposhta")}
                  role="tab"
                  aria-selected={carrierForRender === "ukrposhta"}
                  data-testid="tab-ukrposhta"
                >
                  Укр Пошта
                </button>
              </div>

              {/* ===== Назва адреси (header field) ===== */}
              <ModalField
                label="Назва адреси"
                required
                placeholder="Наприклад, Домашня або Офіс"
                value={draft.title}
                onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
                error={errors.title}
                testId="addr-title"
              />

              {/* ===== STEP 1: Last name + First name ===== */}
              <div className={styles.stepBlock}>
                <div className={styles.stepLabel}>1. Отримувач</div>
                <div className={styles.fieldGrid2}>
                  <ModalField
                    label="Прізвище"
                    required
                    placeholder="Петренко"
                    value={draft.lastName}
                    onChange={(v) => setDraft((d) => ({ ...d, lastName: v }))}
                    error={errors.lastName}
                    testId="addr-last-name"
                  />
                  <ModalField
                    label="Ім'я"
                    required
                    placeholder="Іван"
                    value={draft.firstName}
                    onChange={(v) => setDraft((d) => ({ ...d, firstName: v }))}
                    error={errors.firstName}
                    testId="addr-first-name"
                  />
                </div>
              </div>

              {/* ===== STEP 2: City ===== */}
              <div className={styles.stepBlock}>
                <div className={styles.stepLabel}>2. Місто / Населений пункт</div>
                <ModalField
                  label="Місто"
                  required
                  placeholder="Київ, Львів, с. Первомайськ…"
                  value={draft.city}
                  onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
                  error={errors.city}
                  testId="addr-city"
                />
              </div>

              {/* ===== STEP 3: carrier-specific address (locked until city filled) ===== */}
              {carrierForRender === "novaposhta" ? (
                <div
                  className={`${styles.stepBlock} ${!draft.city.trim() ? styles.stepLocked : ""}`}
                  data-testid="addr-step-np-address"
                >
                  <div className={styles.stepLabel}>
                    3. {draft.deliveryMode === "courier" ? "Адреса доставки" : "Відділення"}
                    {!draft.city.trim() && (
                      <span className={styles.stepHint}> · спочатку вкажіть місто</span>
                    )}
                  </div>
                  {draft.deliveryMode === "branch" ? (
                    <ModalField
                      label="Номер / адреса відділення"
                      required
                      placeholder="Напр., Відділення № 5, вул. Шевченка 12"
                      value={draft.branch}
                      onChange={(v) => setDraft((d) => ({ ...d, branch: v }))}
                      error={errors.branch}
                      testId="addr-branch"
                      disabled={!draft.city.trim()}
                    />
                  ) : (
                    <ModalField
                      label="Вулиця, будинок, квартира"
                      required
                      placeholder="вул. Шевченка 12, кв. 5"
                      value={draft.street}
                      onChange={(v) => setDraft((d) => ({ ...d, street: v }))}
                      error={errors.street}
                      testId="addr-courier-street"
                      disabled={!draft.city.trim()}
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.stepBlock}>
                    <div className={styles.stepLabel}>3. Адреса</div>
                    <ModalField
                      label="Вулиця, будинок, квартира"
                      required
                      placeholder="вул. Київська 135, кв. 12"
                      value={draft.street}
                      onChange={(v) => setDraft((d) => ({ ...d, street: v }))}
                      error={errors.street}
                      testId="addr-street"
                    />
                  </div>
                  <div className={styles.stepBlock}>
                    <div className={styles.stepLabel}>4. Поштовий індекс</div>
                    <ModalField
                      label="Індекс"
                      required
                      placeholder="00000"
                      value={draft.zip}
                      onChange={(v) => setDraft((d) => ({ ...d, zip: v.replace(/\D/g, "").slice(0, 5) }))}
                      error={errors.zip}
                      testId="addr-zip"
                      inputMode="numeric"
                      maxLength={5}
                    />
                  </div>
                </>
              )}

              {/* ===== STEP 4: Phone ===== */}
              <div className={styles.stepBlock}>
                <div className={styles.stepLabel}>
                  {carrierForRender === "novaposhta" ? "4" : "5"}. Контактний телефон
                </div>
                <ModalField
                  label="Телефон"
                  required
                  placeholder="+380 (XX) XXX XX XX"
                  value={draft.phone}
                  onChange={(v) => setDraft((d) => ({ ...d, phone: progressiveFormatUaPhone(v) }))}
                  error={errors.phone}
                  testId="addr-phone"
                  inputMode="tel"
                  maxLength={19}
                />
              </div>

              {/* ===== STEP 5 (NP only): Courier checkbox ===== */}
              {carrierForRender === "novaposhta" && (
                <div className={styles.stepBlock}>
                  <div className={styles.stepLabel}>5. Тип доставки</div>
                  <label className={styles.checkRow}>
                    <input
                      type="checkbox"
                      checked={draft.deliveryMode === "courier"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          deliveryMode: e.target.checked ? "courier" : "branch",
                          // clear opposite field when switching
                          branch: e.target.checked ? "" : d.branch,
                          street: e.target.checked ? d.street : "",
                        }))
                      }
                      data-testid="addr-courier-toggle"
                    />
                    <span>Кур'єрська (адресна) доставка</span>
                  </label>
                  <p className={styles.helperHint}>
                    {draft.deliveryMode === "courier"
                      ? "Курʼєр доставить замовлення на вашу адресу."
                      : "Стандартна доставка у відділення Нової Пошти."}
                  </p>
                </div>
              )}

              {/* ===== Primary ===== */}
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={draft.isPrimary}
                  onChange={(e) => setDraft({ ...draft, isPrimary: e.target.checked })}
                  data-testid="addr-primary"
                />
                <span>Позначити як основну адресу</span>
              </label>

              {/* ===== Actions ===== */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnCancel}`}
                  onClick={closeModal}
                  data-testid="addr-cancel"
                  disabled={submitting}
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnSave}`}
                  onClick={saveDraft}
                  data-testid="address-save"
                  disabled={submitting}
                >
                  {submitting ? "Зберігаємо…" : "Зберегти"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* ============ Confirm delete ============ */}
      <ConfirmModal
        open={confirmDel.open}
        title="Видалити адресу?"
        message="Цю дію не можна буде відмінити."
        confirmLabel="Так, видалити"
        cancelLabel="Скасувати"
        variant="danger"
        onConfirm={doDelete}
        onClose={cancelDelete}
      />

      {/* ============ Toast ============ */}
      <SuccessToast
        open={toast.open}
        message={toast.msg}
        onClose={() => setToast({ open: false, msg: "" })}
      />
    </ProfileLayout>
  );
};

/* ----- ModalField ----- */
const ModalField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  testId?: string;
  inputMode?: "text" | "tel" | "numeric" | "email" | "search";
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, error, testId, inputMode, maxLength, disabled, required }) => (
  <div className={styles.fieldWrap} data-error={error ? "true" : "false"}>
    <label className={styles.fieldLabel}>
      {label}
      {required && <span className={styles.fieldRequired} aria-hidden="true"> *</span>}
    </label>
    <div className={styles.fieldBox} data-disabled={disabled ? "true" : "false"}>
      <input
        type="text"
        className={styles.fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        inputMode={inputMode}
        maxLength={maxLength}
        disabled={disabled}
        aria-required={required ? "true" : undefined}
      />
    </div>
    {error && <div className={styles.fieldError}>{error}</div>}
  </div>
);

export default ProfileAddresses;
