import React, { useEffect, useState } from "react";
import Seo from "../components/Seo";
import ProfileLayout from "./profile-layout";
import SuccessToast from "../components/ui-extras/SuccessToast";
import {
  isValidEmail,
  isValidUaPhone,
  normalizeUaPhone,
  formatUaPhone,
  progressiveFormatUaPhone,
} from "../lib/profile-utils";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  ProfileDTO,
} from "../lib/profile-api";
import styles from "./profile.module.css";

/* =====================================================================
   /profile — Особисті дані (server-backed)
   ===================================================================== */

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const FALLBACK_PROFILE: ProfileData = {
  firstName: "Іван",
  lastName: "Петренко",
  email: "i.petrenko@gmail.com",
  phone: "+380 (50) 937 56 54",
};

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>(FALLBACK_PROFILE);
  const [draft, setDraft] = useState<ProfileData>(FALLBACK_PROFILE);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});
  const [saving, setSaving] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [changingPwd, setChangingPwd] = useState(false);

  const [toast, setToast] = useState<{ open: boolean; msg: string }>({ open: false, msg: "" });

  /* ---------------- hydration from backend ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchProfile();
        if (cancelled) return;
        const p: ProfileData = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
        };
        setProfile(p);
        setDraft(p);
      } catch (err) {
        // network or backend issue → keep fallback
        console.warn("[profile] failed to load from server, using fallback", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- handlers ---------------- */
  const startEdit = () => {
    setDraft(profile);
    setErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setErrors({});
    setEditing(false);
  };

  const validateDraft = (): boolean => {
    const e: Partial<Record<keyof ProfileData, string>> = {};
    if (!draft.firstName.trim()) e.firstName = "Введіть ім'я";
    if (!draft.lastName.trim()) e.lastName = "Введіть прізвище";
    // Пошта — НЕ обов'язкове поле. Валідуємо формат лише якщо щось ввели.
    if (draft.email.trim() && !isValidEmail(draft.email)) {
      e.email = "Некоректна електронна пошта";
    }
    if (!isValidUaPhone(draft.phone)) e.phone = "Введіть український номер у форматі +380 XX XXX XX XX";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveEdit = async () => {
    if (!validateDraft()) return;
    const normalized = normalizeUaPhone(draft.phone) || "";
    const next: ProfileData = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email: draft.email.trim(),
      phone: formatUaPhone(normalized),
    };
    setSaving(true);
    try {
      const updated = await updateProfile(next);
      const p: ProfileData = {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
      };
      setProfile(p);
      setDraft(p);
      setEditing(false);
      setToast({ open: true, msg: "Дані успішно збережені" });
    } catch (err) {
      console.error("[profile] save failed", err);
      setToast({ open: true, msg: "Не вдалося зберегти. Спробуйте ще раз." });
    } finally {
      setSaving(false);
    }
  };

  const handlePhoneChange = (raw: string) => {
    setDraft((d) => ({ ...d, phone: progressiveFormatUaPhone(raw) }));
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);

    if (!currentPwd) {
      setPwdError("Введіть поточний пароль");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError("Новий пароль повинен мати мінімум 6 символів");
      return;
    }

    setChangingPwd(true);
    const res = await changePassword(currentPwd, newPwd);
    setChangingPwd(false);

    if (!res.ok) {
      setPwdError(res.message || "Не вдалося змінити пароль");
      return;
    }
    setCurrentPwd("");
    setNewPwd("");
    setShowCurrent(false);
    setShowNew(false);
    setToast({ open: true, msg: "Пароль успішно змінено" });
  };

  return (
    <ProfileLayout breadcrumb="Особисті дані" title="Особисті дані">
      <Seo title="Особисті дані" canonical="/profile" noindex />
      {/* ============ Personal Data card ============ */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Особисті дані</h3>
          {!editing ? (
            <button
              type="button"
              className={styles.editLink}
              onClick={startEdit}
              data-testid="profile-edit-toggle"
            >
              Редагувати
            </button>
          ) : (
            <div className={styles.editActions}>
              <button
                type="button"
                className={styles.editLinkCancel}
                onClick={cancelEdit}
                data-testid="profile-edit-cancel"
                disabled={saving}
              >
                Скасувати
              </button>
              <button
                type="button"
                className={styles.editLinkSave}
                onClick={saveEdit}
                data-testid="profile-edit-save"
                disabled={saving}
              >
                {saving ? "Зберігаємо…" : "Зберегти"}
              </button>
            </div>
          )}
        </header>

        <div className={styles.fieldGrid2}>
          <Field
            label="Ім'я"
            required
            value={editing ? draft.firstName : profile.firstName}
            onChange={(v) => setDraft((d) => ({ ...d, firstName: v }))}
            disabled={!editing}
            error={errors.firstName}
            testId="profile-first-name"
          />
          <Field
            label="Прізвище"
            required
            value={editing ? draft.lastName : profile.lastName}
            onChange={(v) => setDraft((d) => ({ ...d, lastName: v }))}
            disabled={!editing}
            error={errors.lastName}
            testId="profile-last-name"
          />
          <Field
            label="Пошта"
            type="email"
            value={editing ? draft.email : profile.email}
            onChange={(v) => setDraft((d) => ({ ...d, email: v }))}
            disabled={!editing}
            error={errors.email}
            testId="profile-email"
            placeholder="—"
          />
          <Field
            label="Телефон"
            required
            type="tel"
            value={editing ? draft.phone : profile.phone}
            onChange={handlePhoneChange}
            disabled={!editing}
            error={errors.phone}
            testId="profile-phone"
            placeholder="+380 (XX) XXX XX XX"
            inputMode="tel"
            maxLength={19}
          />
        </div>
      </section>

      {/* ============ Security card ============ */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Безпека</h3>
        </header>

        <form className={styles.passwordRow} onSubmit={handleChangePwd}>
          <PasswordField
            label="Поточний пароль"
            value={currentPwd}
            onChange={setCurrentPwd}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((v) => !v)}
            placeholder="••••••••"
            testId="profile-current-password"
            autoComplete="current-password"
          />
          <PasswordField
            label="Новий пароль"
            value={newPwd}
            onChange={setNewPwd}
            visible={showNew}
            onToggleVisible={() => setShowNew((v) => !v)}
            placeholder="Введіть новий пароль"
            testId="profile-new-password"
            autoComplete="new-password"
          />

          <button
            type="submit"
            className={styles.submitBtn}
            data-testid="profile-change-password"
            disabled={changingPwd}
          >
            <span>{changingPwd ? "Змінюємо…" : "Змінити пароль"}</span>
            <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true">
              <path d="M1 6H13M13 6L8 1M13 6L8 11" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        {pwdError && (
          <div className={styles.errorMsg} data-testid="profile-password-msg">
            {pwdError}
          </div>
        )}
      </section>

      {/* ============ Toast ============ */}
      <SuccessToast
        open={toast.open}
        message={toast.msg}
        onClose={() => setToast({ open: false, msg: "" })}
      />
    </ProfileLayout>
  );
};

/* ----- Generic Field ----- */
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  testId?: string;
  error?: string;
  placeholder?: string;
  inputMode?: "text" | "tel" | "email" | "numeric" | "search";
  maxLength?: number;
  required?: boolean;
}> = ({ label, value, onChange, type = "text", disabled, testId, error, placeholder, inputMode, maxLength, required }) => (
  <div className={styles.fieldWrap} data-error={error ? "true" : "false"}>
    <label className={styles.fieldLabel}>
      {label}
      {required && <span className={styles.fieldRequired} aria-hidden="true"> *</span>}
    </label>
    <div className={styles.fieldBox} data-disabled={disabled ? "true" : "false"}>
      <input
        type={type}
        className={styles.fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={testId}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-required={required ? "true" : undefined}
      />
    </div>
    {error && <div className={styles.fieldError}>{error}</div>}
  </div>
);

/* ----- Password Field with single eye toggle on LEFT ----- */
const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggleVisible: () => void;
  placeholder?: string;
  testId?: string;
  autoComplete?: string;
}> = ({ label, value, onChange, visible, onToggleVisible, placeholder, testId, autoComplete }) => (
  <div className={styles.fieldWrap}>
    <label className={styles.fieldLabel}>{label}</label>
    <div className={styles.fieldBox}>
      <button
        type="button"
        className={styles.eyeBtn}
        onClick={onToggleVisible}
        aria-label={visible ? "Сховати пароль" : "Показати пароль"}
        data-testid={`${testId}-toggle`}
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
      <input
        type={visible ? "text" : "password"}
        className={styles.fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        autoComplete={autoComplete}
      />
    </div>
  </div>
);

/* ----- Clean Eye / EyeOff icons (Feather-style) ----- */
const EyeIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#93928c"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#93928c"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default Profile;
