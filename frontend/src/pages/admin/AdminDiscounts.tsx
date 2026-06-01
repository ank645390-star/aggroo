import React, { useEffect, useMemo, useState } from "react";
import { getToken } from "../../lib/auth-api";
import {
  adminListDiscountRules,
  adminCreateDiscountRule,
  adminUpdateDiscountRule,
  adminDeleteDiscountRule,
  RULE_TYPE_LABELS,
  RULE_TYPE_UNITS,
  type DiscountRule,
  type DiscountRuleCreate,
  type DiscountRuleType,
} from "../../lib/discounts-api";
import { listPublicCategories } from "../../lib/products-api";
import styles from "./AdminDiscounts.module.css";

/* =====================================================================
 *  AdminDiscounts — повноцінне керування правилами знижок.
 *
 *  Підтримує 6 типів правил (cart_* та category_*), активацію/деактивацію,
 *  пріоритети, CRUD, прев'ю карти на основі прикладу.
 *  Усі правила застосовуються на стороні бекенда в /api/discounts/preview
 *  (саме він використовується checkout.tsx — повний sync між адмінкою і клієнтом).
 * ===================================================================== */

const TYPE_OPTIONS: { value: DiscountRuleType; label: string; needCategory: boolean }[] = [
  { value: "cart_volume_l",     label: RULE_TYPE_LABELS.cart_volume_l,     needCategory: false },
  { value: "cart_quantity",     label: RULE_TYPE_LABELS.cart_quantity,     needCategory: false },
  { value: "cart_subtotal",     label: RULE_TYPE_LABELS.cart_subtotal,     needCategory: false },
  { value: "category_volume_l", label: RULE_TYPE_LABELS.category_volume_l, needCategory: true  },
  { value: "category_quantity", label: RULE_TYPE_LABELS.category_quantity, needCategory: true  },
  { value: "category_subtotal", label: RULE_TYPE_LABELS.category_subtotal, needCategory: true  },
];

interface CategoryOption { slug: string; label: string; }

const EMPTY_FORM: DiscountRuleCreate = {
  name: "",
  description: "",
  type: "cart_volume_l",
  threshold: 100,
  percent: 5,
  category_slug: undefined,
  active: true,
  priority: 0,
  label: "",
};

const AdminDiscounts: React.FC = () => {
  const token = getToken();
  const [rules, setRules] = useState<DiscountRule[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DiscountRuleCreate>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const needsCategory = useMemo(
    () => TYPE_OPTIONS.find((t) => t.value === form.type)?.needCategory ?? false,
    [form.type]
  );

  // ===== Load data =====
  async function reload() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await adminListDiscountRules(token);
      setRules(list);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Не вдалося завантажити правила");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // Завантажуємо категорії товарів для селектора
    listPublicCategories()
      .then((res) => {
        const cats = (res as any)?.items || [];
        setCategories(
          cats.map((c: any) => ({
            slug: c.slug || c.id,
            label: c.name || c.title || c.slug,
          }))
        );
      })
      .catch(() => { /* keep empty */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ===== Helpers =====
  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function startEdit(rule: DiscountRule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      description: rule.description || "",
      type: rule.type,
      threshold: rule.threshold,
      percent: rule.percent,
      category_slug: rule.category_slug || undefined,
      active: rule.active,
      priority: rule.priority,
      label: rule.label || "",
    });
    setTimeout(() => {
      document.getElementById("admin-discount-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: DiscountRuleCreate = {
        ...form,
        name: form.name.trim(),
        label: (form.label || "").trim() || form.name.trim(),
        description: (form.description || "").trim(),
        category_slug: needsCategory ? (form.category_slug || null) : null,
      };
      if (!payload.name) {
        throw new Error("Вкажіть назву правила");
      }
      if (needsCategory && !payload.category_slug) {
        throw new Error("Виберіть категорію для category-правила");
      }
      if (editingId) {
        await adminUpdateDiscountRule(token, editingId, payload);
      } else {
        await adminCreateDiscountRule(token, payload);
      }
      resetForm();
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Помилка збереження");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(rule: DiscountRule) {
    if (!token) return;
    if (!confirm(`Видалити правило «${rule.name}»?`)) return;
    setError(null);
    try {
      await adminDeleteDiscountRule(token, rule.id);
      if (editingId === rule.id) resetForm();
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Не вдалося видалити");
    }
  }

  async function handleToggleActive(rule: DiscountRule) {
    if (!token) return;
    try {
      await adminUpdateDiscountRule(token, rule.id, { active: !rule.active });
      await reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Не вдалося оновити статус");
    }
  }

  // ===== Render =====
  return (
    <div className={styles.wrap} data-testid="admin-discounts-page">
      <header className={styles.header}>
        <div>
          <h1 className={styles.h1}>Знижки</h1>
          <p className={styles.sub}>
            Гнучкі правила, які накладаються на кошик автоматично. Підтримуються знижки
            за обʼємом (літрах), кількістю одиниць, сумою кошика — як для усього кошика,
            так і для окремих категорій товарів.
          </p>
        </div>
      </header>

      {error && (
        <div className={styles.error} data-testid="admin-discounts-error">
          {error}
        </div>
      )}

      {/* ===================== FORM ===================== */}
      <form id="admin-discount-form" className={styles.form} onSubmit={handleSubmit}>
        <h2 className={styles.h2}>
          {editingId ? "Редагувати правило" : "Створити нове правило"}
        </h2>

        <div className={styles.grid2}>
          <label className={styles.field}>
            <span>Назва (для адмінки)</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Напр., При купівлі від 100 л"
              data-testid="admin-discount-name"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Підпис на сторінці чекауту</span>
            <input
              type="text"
              value={form.label || ""}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="При купівлі 100 л"
              data-testid="admin-discount-label"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Опис (опціонально)</span>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            data-testid="admin-discount-description"
          />
        </label>

        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Тип правила</span>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as DiscountRuleType,
                  category_slug: undefined,
                })
              }
              data-testid="admin-discount-type"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Поріг ({RULE_TYPE_UNITS[form.type]})</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: parseFloat(e.target.value) || 0 })}
              data-testid="admin-discount-threshold"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Відсоток знижки (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.percent}
              onChange={(e) => setForm({ ...form, percent: parseFloat(e.target.value) || 0 })}
              data-testid="admin-discount-percent"
              required
            />
          </label>
        </div>

        {needsCategory && (
          <label className={styles.field}>
            <span>Категорія товарів</span>
            <select
              value={form.category_slug || ""}
              onChange={(e) => setForm({ ...form, category_slug: e.target.value || undefined })}
              data-testid="admin-discount-category"
              required
            >
              <option value="">— виберіть категорію —</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label} ({c.slug})</option>
              ))}
            </select>
          </label>
        )}

        <div className={styles.grid3}>
          <label className={styles.field}>
            <span>Пріоритет</span>
            <input
              type="number"
              value={form.priority || 0}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value || "0", 10) })}
              data-testid="admin-discount-priority"
            />
          </label>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              data-testid="admin-discount-active"
            />
            <span>Активне (застосовується)</span>
          </label>

          <div className={styles.actions}>
            {editingId && (
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={resetForm}
                data-testid="admin-discount-cancel"
              >
                Скасувати
              </button>
            )}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={submitting}
              data-testid="admin-discount-submit"
            >
              {submitting ? "Збереження…" : editingId ? "Оновити" : "Створити"}
            </button>
          </div>
        </div>
      </form>

      {/* ===================== LIST ===================== */}
      <section className={styles.listSection}>
        <h2 className={styles.h2}>Існуючі правила ({rules.length})</h2>
        {loading ? (
          <div className={styles.muted}>Завантаження…</div>
        ) : rules.length === 0 ? (
          <div className={styles.muted}>Поки що немає правил. Створіть перше вище.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Стат.</th>
                  <th>Назва</th>
                  <th>Тип</th>
                  <th>Категорія</th>
                  <th>Поріг</th>
                  <th>%</th>
                  <th>Пріор.</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} data-testid={`admin-discount-row-${r.id}`} className={r.active ? "" : styles.rowDisabled}>
                    <td>
                      <button
                        type="button"
                        className={r.active ? styles.statusOn : styles.statusOff}
                        onClick={() => handleToggleActive(r)}
                        title="Натисніть, щоб перемкнути активність"
                        data-testid={`admin-discount-toggle-${r.id}`}
                      >
                        {r.active ? "ON" : "OFF"}
                      </button>
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{r.name}</strong>
                        {r.label ? <div className={styles.cellMuted}>«{r.label}»</div> : null}
                        {r.description ? <div className={styles.cellMuted}>{r.description}</div> : null}
                      </div>
                    </td>
                    <td>{RULE_TYPE_LABELS[r.type]}</td>
                    <td>{r.category_slug || <span className={styles.cellMuted}>—</span>}</td>
                    <td>{r.threshold} {RULE_TYPE_UNITS[r.type]}</td>
                    <td>{r.percent}%</td>
                    <td>{r.priority}</td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          className={styles.btnLink}
                          onClick={() => startEdit(r)}
                          data-testid={`admin-discount-edit-${r.id}`}
                        >
                          Редагувати
                        </button>
                        <button
                          type="button"
                          className={styles.btnLinkDanger}
                          onClick={() => handleDelete(r)}
                          data-testid={`admin-discount-delete-${r.id}`}
                        >
                          Видалити
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDiscounts;
