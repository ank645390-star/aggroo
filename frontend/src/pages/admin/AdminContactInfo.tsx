import React, { useEffect, useState } from "react";
import { getSettings, updateSettings, type AdminSettings } from "../../lib/admin-api";
import { useContactInfo } from "../../context/ContactInfoContext";
import styles from "./AdminContactInfo.module.css";

/* =====================================================================
   Admin — Контактна інформація сайту.
   Зберігається в admin_settings, публічно доступне через /api/contact-info.
   Зміна відразу впливає на: Welcome (Отримати консультацію + телефон),
   Каталог, Контакти (картки + кнопка під CTA) та Футер.
   ===================================================================== */

const AdminContactInfo: React.FC = () => {
  const { refresh: refreshGlobal } = useContactInfo();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [initial, setInitial] = useState<Partial<AdminSettings>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getSettings();
      setPrimary(s.contact_phone_primary || "");
      setSecondary(s.contact_phone_secondary || "");
      setEmail(s.contact_email || "");
      setAddress(s.contact_address || "");
      setInitial(s);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Не вдалося завантажити налаштування");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setPrimary(initial.contact_phone_primary || "");
    setSecondary(initial.contact_phone_secondary || "");
    setEmail(initial.contact_email || "");
    setAddress(initial.contact_address || "");
    setError(null);
    setSuccess(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateSettings({
        contact_phone_primary: primary.trim(),
        contact_phone_secondary: secondary.trim(),
        contact_email: email.trim(),
        contact_address: address.trim(),
      });
      await refreshGlobal(); // оновлюємо контекст одразу
      await load();
      setSuccess("Контактну інформацію збережено. Зміни видно скрізь на сайті.");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.loading}>Завантаження…</div>;

  return (
    <div className={styles.shell} data-testid="admin-contact-info-page">
      <p className={styles.sub}>
        Ці значення підтягуються на: <strong>Welcome</strong> (кнопка «Отримати консультацію» та телефон),
        <strong> Каталог</strong> (кнопка «Замовити дзвінок»), <strong>Контакти</strong>{" "}
        (картки + кнопка з телефоном) та <strong>Футер</strong>. Після збереження зміни видно одразу.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.card}>
        <label className={styles.label}>
          Основний телефон
          <input
            className={styles.input}
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
            placeholder="+380 (50) 937-56-57"
            data-testid="admin-contact-phone-primary"
          />
          <span className={styles.hint}>
            Цей номер використовується для click-to-call на Welcome (під кнопкою CTA),
            у CTA-секції Контакти та у Футері.
          </span>
        </label>

        <label className={styles.label}>
          Додатковий телефон
          <input
            className={styles.input}
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            placeholder="+380 (67) 510-13-07"
            data-testid="admin-contact-phone-secondary"
          />
          <span className={styles.hint}>Відображається у картці «Телефон» на Контактах та у Футері.</span>
        </label>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tamisagro@gmail.com"
            data-testid="admin-contact-email"
          />
          <span className={styles.hint}>Картка «Пошта» на Контактах та посилання mailto: у Футері.</span>
        </label>

        <label className={styles.label}>
          Адреса
          <input
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="55200, м. Первомайськ, вул. Київська 135, Миколаївська область"
            data-testid="admin-contact-address"
          />
          <span className={styles.hint}>Картка «Адреса» на Контактах та блок у Футері.</span>
        </label>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={reset} disabled={saving}>
            Скинути
          </button>
          <button type="button" className={styles.btn} onClick={save} disabled={saving} data-testid="admin-contact-save">
            {saving ? "Зберігаємо…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminContactInfo;
